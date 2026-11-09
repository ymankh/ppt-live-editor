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

// Smallest byte layouts that pass the TTF/OTF/WOFF/WOFF2 structure checks: one table right after the directory.
function sfnt(signature: number, tableLength = 4): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature);
  view.setUint16(4, 1);
  view.setUint32(12 + 8, 28);
  view.setUint32(12 + 12, tableLength);
  return bytes;
}

function woff(): Uint8Array {
  const bytes = new Uint8Array(68);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x774f4646);
  view.setUint32(4, 0x00010000);
  view.setUint32(8, bytes.length);
  view.setUint16(12, 1);
  view.setUint32(16, 28);
  view.setUint32(44 + 4, 64);
  view.setUint32(44 + 8, 4);
  view.setUint32(44 + 12, 4);
  return bytes;
}

function woff2(): Uint8Array {
  const bytes = new Uint8Array(52);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x774f4632);
  view.setUint32(4, 0x00010000);
  view.setUint32(8, bytes.length);
  view.setUint16(12, 1);
  view.setUint32(16, 28);
  view.setUint32(20, 4);
  return bytes;
}

const uploadFont = (family: string | undefined, body: Uint8Array, method = 'POST') =>
  fetch(`${base}/api/fonts${family === undefined ? '' : `?family=${encodeURIComponent(family)}`}`, {
    method, headers: { 'Content-Type': 'application/octet-stream' }, body,
  });

test('font library uploads, lists and serves validated fonts', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/fonts`)).json(), []);

  const created = await uploadFont('Test Sans', sfnt(0x00010000));
  assert.equal(created.status, 201);
  assert.match(created.headers.get('content-type') ?? '', /^application\/json/);
  const font = (await created.json()) as { id: string; family: string };
  assert.match(font.id, /^[0-9a-f]{32}$/);
  assert.equal(font.family, 'Test Sans');
  assert.equal(created.headers.get('location'), `/api/fonts/${font.id}/content`);

  assert.equal((await uploadFont('  beta  ', sfnt(0x4f54544f), 'PUT')).status, 201);
  assert.equal((await uploadFont('Alpha', woff())).status, 201);
  assert.equal((await uploadFont('Gamma', woff2())).status, 201);
  assert.equal((await uploadFont('Apple', sfnt(0x74727565))).status, 201);

  const list = (await (await fetch(`${base}/api/fonts`)).json()) as { id: string; family: string }[];
  assert.deepEqual(list.map((entry) => entry.family), ['Alpha', 'Apple', 'beta', 'Gamma', 'Test Sans']);

  const content = await fetch(`${base}/api/fonts/${font.id}/content`);
  assert.equal(content.status, 200);
  assert.equal(content.headers.get('content-type'), 'font/ttf');
  assert.equal(content.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(content.headers.get('content-disposition'), null);
  assert.deepEqual(new Uint8Array(await content.arrayBuffer()), sfnt(0x00010000));

  const types = await Promise.all(list.map(async (entry) =>
    (await fetch(`${base}/api/fonts/${entry.id}/content`)).headers.get('content-type')));
  assert.deepEqual(types, ['font/woff', 'font/ttf', 'font/otf', 'font/woff2', 'font/ttf']);
  assert.equal((await fetch(`${base}/api/fonts/missing/content`)).status, 404);
});

test('font uploads reject bad names, non-fonts, duplicates and oversized bodies', async () => {
  const font = sfnt(0x00010000);
  assert.equal((await uploadFont('Unique Family', font)).status, 201);
  const duplicate = await uploadFont('UNIQUE FAMILY', font);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.headers.get('content-type'), 'application/problem+json');
  assert.equal(((await duplicate.json()) as { title: string }).title, 'A font with this family name is already uploaded.');

  for (const family of [undefined, '   ', 'One, Two', 'Quote"d', 'Brace{', 'Control\u0001', 'Next\u0085Line', 'F'.repeat(201)])
    assert.equal((await uploadFont(family, font)).status, 400, `family ${JSON.stringify(family)}`);
  assert.equal((await uploadFont('F'.repeat(200), font)).status, 201);

  for (const body of [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]), sfnt(0x00010000, 8), new Uint8Array(4)])
    assert.equal((await uploadFont('Not A Font', body)).status, 400);

  const port = (server.address() as AddressInfo).port;
  const oversized = await new Promise<{ status: number | undefined; connection: string | undefined }>((resolve, reject) => {
    const upload = request({
      host: '127.0.0.1', port, method: 'POST', path: '/api/fonts?family=Huge',
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': 20 * 1024 * 1024 + 1 },
    }, (response) => {
      response.resume();
      resolve({ status: response.statusCode, connection: response.headers.connection });
      upload.destroy();
    });
    upload.on('error', reject);
    upload.flushHeaders();
  });
  assert.deepEqual(oversized, { status: 413, connection: 'close' });
  assert.equal((await fetch(`${base}/api/fonts`, { method: 'DELETE' })).status, 405);
});
