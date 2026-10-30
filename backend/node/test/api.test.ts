import assert from 'node:assert/strict';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.ts';
import { FolioRepository } from '../src/repository.ts';
import { localCurrentUserProvider } from '../src/users.ts';

let server: Server;
let repository: FolioRepository;
let base = '';

before(async () => {
  repository = FolioRepository.open(':memory:');
  server = createServer(createApp({ repository, currentUserProvider: localCurrentUserProvider, allowedHosts: new Set(['127.0.0.1']) }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  repository.close();
});

const presentation = (id: string, updatedAt: string, assetId = 'asset-1') => ({
  id, title: `Deck ${id}`, version: 1, createdAt: '2026-10-01T00:00:00.000Z', updatedAt,
  slideSize: { width: 1920, height: 1080 }, theme: { name: 'x' },
  slides: [{ id: 's1', background: { type: 'solid' }, elements: [{ id: 'e1', type: 'image', assetId }] }],
});

const putProject = (id: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/projects/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });

test('health and current user', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
  assert.deepEqual(await (await fetch(`${base}/api/users/me`)).json(), { id: 'local-jordan-doe', displayName: 'Jordan Doe', initials: 'JD' });
});

test('project lifecycle, ordering and encoded IDs', async () => {
  assert.equal((await fetch(`${base}/api/projects/latest/document`)).status, 404);
  assert.equal((await putProject('a/b', presentation('a/b', '2026-10-02T00:00:00.000Z'))).status, 204);
  assert.equal((await putProject('latest', presentation('latest', '2026-10-03T00:00:00.000Z'))).status, 204);

  const list = (await (await fetch(`${base}/api/projects`)).json()) as { id: string; slideCount: number }[];
  assert.deepEqual(list.map((p) => p.id), ['latest', 'a/b']);
  assert.equal(list[0]?.slideCount, 1);

  const latest = (await (await fetch(`${base}/api/projects/latest/document`)).json()) as { id: string };
  assert.equal(latest.id, 'latest');
  const byId = (await (await fetch(`${base}/api/projects/a%2Fb`)).json()) as { id: string };
  assert.equal(byId.id, 'a/b');

  assert.equal((await putProject('a/b', presentation('a/b', '2026-10-04T00:00:00.000Z'), { 'If-None-Match': '*' })).status, 412);
  assert.equal((await fetch(`${base}/api/projects/a%2Fb`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/api/projects/a%2Fb`)).status, 404);
  assert.equal((await fetch(`${base}/api/projects/a%2Fb`, { method: 'DELETE' })).status, 204);
});

test('project validation', async () => {
  assert.equal((await putProject('x', presentation('y', '2026-10-02T00:00:00.000Z'))).status, 400);
  const noAsset = presentation('x', '2026-10-02T00:00:00.000Z', ' ');
  assert.equal((await putProject('x', noAsset)).status, 400);
  const malformed = await fetch(`${base}/api/projects/x`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get('content-type'), 'application/problem+json');
  const wrongType = await fetch(`${base}/api/projects/x`, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(wrongType.status, 415);
});

test('assets round-trip and are collected with their only project', async () => {
  const bytes = new Uint8Array([1, 2, 3, 250]);
  const put = await fetch(`${base}/api/assets/img%201`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: bytes });
  assert.equal(put.status, 204);
  assert.equal((await fetch(`${base}/api/assets/img%201`, { method: 'PUT', headers: { 'Content-Type': 'image/png', 'If-None-Match': '*' }, body: bytes })).status, 412);

  const got = await fetch(`${base}/api/assets/img%201`);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'image/png');
  assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
  assert.match(got.headers.get('content-disposition') ?? '', /^attachment/);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), bytes);

  assert.equal((await putProject('owner', presentation('owner', '2026-10-05T00:00:00.000Z', 'img 1'))).status, 204);
  await fetch(`${base}/api/projects/owner`, { method: 'DELETE' });
  assert.equal((await fetch(`${base}/api/assets/img%201`)).status, 404);

  assert.equal((await fetch(`${base}/api/assets/bad`, { method: 'PUT', headers: { 'Content-Type': 'not a type' }, body: bytes })).status, 400);
});

test('routing and host filtering', async () => {
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/health`, { method: 'DELETE' })).status, 405);
  const port = (server.address() as AddressInfo).port;
  const status = await new Promise<number | undefined>((resolve, reject) => {
    request({ host: '127.0.0.1', port, path: '/api/health', headers: { Host: 'evil.example' } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject).end();
  });
  assert.equal(status, 400);
});
