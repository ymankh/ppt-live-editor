/**
 * Cross-backend contract check between the ASP.NET API (backend/Folio.Api) and the Node API (backend/node).
 *
 * 1. Route inventory: the method/path pairs declared by the C# controllers must equal the Node route table.
 * 2. Behavior (when both URLs are given): the same request scenario runs against each server, each with a
 *    fresh database, and the normalized responses (status, media type, key headers, body) must be identical.
 *
 * Usage:
 *   node --experimental-strip-types backend/contract/compare.ts                         # routes only
 *   node --experimental-strip-types backend/contract/compare.ts --dotnet URL --node URL # routes + behavior
 */
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { readdirSync, readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import path from 'node:path';
import { createRoutes, listRoutes } from '../node/src/app.ts';
import { FolioRepository } from '../node/src/repository.ts';
import { localCurrentUserProvider } from '../node/src/users.ts';

const controllersDir = path.resolve(import.meta.dirname, '../Folio.Api/Controllers');
const normalizeRoute = (method: string, route: string): string =>
  `${method.toUpperCase()} /${route.replace(/^\/+|\/+$/g, '').replace(/\{[^}]*\}/g, '{}').toLowerCase()}`;

function dotnetRoutes(): string[] {
  const routes: string[] = [];
  for (const file of readdirSync(controllersDir).filter((name) => name.endsWith('Controller.cs'))) {
    const source = readFileSync(path.join(controllersDir, file), 'utf8');
    const prefix = /\[Route\("([^"]*)"\)\]\s*(?:\[[^\]]*\]\s*)*public\s+(?:sealed\s+)?class/.exec(source)?.[1] ?? '';
    for (const match of source.matchAll(/\[Http(Get|Put|Post|Delete|Patch)(?:\("([^"]*)"\))?\]/g)) {
      const [, method = '', template = ''] = match;
      routes.push(normalizeRoute(method, template.startsWith('/') ? template : [prefix, template].filter(Boolean).join('/')));
    }
  }
  return routes.sort();
}

function nodeRoutes(): string[] {
  const repository = FolioRepository.open(':memory:');
  try {
    return listRoutes(createRoutes({ repository, currentUserProvider: localCurrentUserProvider }))
      .map(({ method, path: route }) => normalizeRoute(method, route))
      .sort();
  } finally {
    repository.close();
  }
}

function compareRoutes(): string[] {
  const dotnet = new Set(dotnetRoutes());
  const node = new Set(nodeRoutes());
  const problems = [
    ...[...dotnet].filter((route) => !node.has(route)).map((route) => `route only in .NET: ${route}`),
    ...[...node].filter((route) => !dotnet.has(route)).map((route) => `route only in Node: ${route}`),
  ];
  console.log(`Routes: ${dotnet.size} in .NET, ${node.size} in Node${problems.length === 0 ? ' — identical' : ''}`);
  return problems;
}

// ---- Behavioral scenario --------------------------------------------------------------------------

interface Step {
  readonly name: string;
  readonly method: string;
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
  /** `status` compares only status codes (for framework-generated responses such as host filtering). */
  readonly compare?: 'full' | 'status';
}

interface Observed {
  readonly status: number;
  readonly mediaType: string | null;
  readonly headers: Readonly<Record<string, string | null>>;
  readonly body: unknown;
}

const comparedHeaders = ['content-disposition', 'x-content-type-options'];
const json = (value: unknown): string => JSON.stringify(value);

const presentation = (id: string, updatedAt: string, overrides: Readonly<Record<string, unknown>> = {}, assetId = 'asset-1') => ({
  id, title: `Deck ${id}`, version: 1, createdAt: '2026-10-01T00:00:00.000Z', updatedAt,
  slideSize: { width: 1920, height: 1080 }, theme: { name: 'Editorial', colors: ['#fff', '#000'] },
  slides: [{
    id: 's1', background: { type: 'solid', color: '#fff' },
    elements: [{ id: 'e1', type: 'image', assetId, x: 1.5 }, { id: 'e2', type: 'text', content: { type: 'doc' } }],
  }],
  ...overrides,
});

const jsonPut = (name: string, route: string, value: unknown, headers: Readonly<Record<string, string>> = {}): Step => ({
  name, method: 'PUT', path: route, headers: { 'Content-Type': 'application/json', ...headers }, body: json(value),
});

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 255]);

const scenario: readonly Step[] = [
  { name: 'health', method: 'GET', path: '/api/health' },
  { name: 'health, case-insensitive path', method: 'GET', path: '/API/Health' },
  { name: 'current user', method: 'GET', path: '/api/users/me' },
  { name: 'empty project list', method: 'GET', path: '/api/projects' },
  { name: 'latest with no projects', method: 'GET', path: '/api/projects/latest/document' },
  { name: 'missing project', method: 'GET', path: '/api/projects/missing' },
  jsonPut('create project with encoded slash', '/api/projects/a%2Fb', presentation('a/b', '2026-10-02T00:00:00.000Z')),
  jsonPut('create project named latest', '/api/projects/latest', presentation('latest', '2026-10-03T00:00:00.000Z')),
  jsonPut('create unicode project', '/api/projects/u', presentation('u', '2026-10-01T12:00:00.000Z', { title: 'Ünïcødé <b>&amp; "quotes" 🎉' })),
  { name: 'project list ordering and summaries', method: 'GET', path: '/api/projects' },
  { name: 'project list, trailing slash', method: 'GET', path: '/api/projects/' },
  { name: 'latest document', method: 'GET', path: '/api/projects/latest/document' },
  { name: 'project named latest', method: 'GET', path: '/api/projects/latest' },
  { name: 'project with encoded slash', method: 'GET', path: '/api/projects/a%2Fb' },
  jsonPut('replace project', '/api/projects/a%2Fb', presentation('a/b', '2026-10-04T00:00:00.000Z', { title: 'Renamed' })),
  { name: 'replaced project', method: 'GET', path: '/api/projects/a%2Fb' },
  jsonPut('create-only conflict', '/api/projects/a%2Fb', presentation('a/b', '2026-10-05T00:00:00.000Z'), { 'If-None-Match': '*' }),
  jsonPut('route/body ID mismatch', '/api/projects/x', presentation('y', '2026-10-02T00:00:00.000Z')),
  jsonPut('wrong version', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', { version: 2 })),
  jsonPut('bad timestamp', '/api/projects/x', presentation('x', 'not a date')),
  jsonPut('no slides', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', { slides: [] })),
  jsonPut('zero slide width', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', { slideSize: { width: 0, height: 1 } })),
  jsonPut('image without asset', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', {}, ' ')),
  jsonPut('slide without elements', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', { slides: [{ id: 's', background: {} }] })),
  jsonPut('non-string nested asset', '/api/projects/x', presentation('x', '2026-10-02T00:00:00.000Z', { extra: { assetId: 3 } })),
  jsonPut('non-object body', '/api/projects/x', [1, 2]),
  { name: 'malformed JSON', method: 'PUT', path: '/api/projects/x', headers: { 'Content-Type': 'application/json' }, body: '{"id":' },
  { name: 'empty JSON body', method: 'PUT', path: '/api/projects/x', headers: { 'Content-Type': 'application/json' }, body: '' },
  { name: 'unsupported media type', method: 'PUT', path: '/api/projects/x', headers: { 'Content-Type': 'text/plain' }, body: '{}' },
  { name: 'store asset', method: 'PUT', path: '/api/assets/img%201', headers: { 'Content-Type': 'image/png' }, body: pngBytes },
  { name: 'asset create-only conflict', method: 'PUT', path: '/api/assets/img%201', headers: { 'Content-Type': 'image/png', 'If-None-Match': '*' }, body: pngBytes },
  { name: 'read asset', method: 'GET', path: '/api/assets/img%201' },
  { name: 'store svg asset', method: 'PUT', path: '/api/assets/vector', headers: { 'Content-Type': 'image/svg+xml' }, body: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
  { name: 'read svg asset', method: 'GET', path: '/api/assets/vector' },
  { name: 'invalid asset content type', method: 'PUT', path: '/api/assets/bad', headers: { 'Content-Type': 'not a type' }, body: pngBytes },
  { name: 'missing asset', method: 'GET', path: '/api/assets/missing' },
  jsonPut('project owning the asset', '/api/projects/owner', presentation('owner', '2026-09-01T00:00:00.000Z', {}, 'img 1')),
  jsonPut('project sharing the svg', '/api/projects/sharer-1', presentation('sharer-1', '2026-09-01T00:00:00.000Z', {}, 'vector')),
  jsonPut('second project sharing the svg', '/api/projects/sharer-2', presentation('sharer-2', '2026-09-01T00:00:00.000Z', {}, 'vector')),
  { name: 'delete owner', method: 'DELETE', path: '/api/projects/owner' },
  { name: 'exclusive asset collected', method: 'GET', path: '/api/assets/img%201' },
  { name: 'delete one sharer', method: 'DELETE', path: '/api/projects/sharer-1' },
  { name: 'shared asset kept', method: 'GET', path: '/api/assets/vector' },
  { name: 'idempotent delete', method: 'DELETE', path: '/api/projects/owner' },
  { name: 'final project list', method: 'GET', path: '/api/projects' },
  { name: 'unknown route', method: 'GET', path: '/api/nope' },
  { name: 'unsupported method', method: 'DELETE', path: '/api/health' },
  { name: 'POST to collection', method: 'POST', path: '/api/projects', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  { name: 'disallowed Host header', method: 'GET', path: '/api/health', headers: { Host: 'evil.example' }, compare: 'status' },
];

function send(base: URL, step: Step): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const body = step.body === undefined ? undefined : typeof step.body === 'string' ? Buffer.from(step.body) : Buffer.from(step.body);
    const headers: Record<string, string | number> = { ...step.headers };
    if (body !== undefined) headers['Content-Length'] = body.length;
    const req = httpRequest({ host: base.hostname, port: base.port, method: step.method, path: step.path, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function observe(base: URL, step: Step): Promise<Observed> {
  const response = await send(base, step);
  const header = (name: string): string | null => {
    const value = response.headers[name];
    return value === undefined ? null : Array.isArray(value) ? value.join(', ') : value;
  };
  if (step.compare === 'status') return { status: response.status, mediaType: null, headers: {}, body: null };

  const mediaType = header('content-type')?.split(';')[0]?.trim().toLowerCase() ?? null;
  let body: unknown;
  if (response.body.length === 0) body = null;
  else if (mediaType === 'application/problem+json') {
    // Framework-generated problem text (titles, trace IDs) differs; the client contract is the status.
    const parsed: unknown = JSON.parse(response.body.toString('utf8'));
    body = { problemStatus: typeof parsed === 'object' && parsed !== null && 'status' in parsed ? parsed.status : undefined };
  } else if (mediaType?.endsWith('json') === true) body = JSON.parse(response.body.toString('utf8'));
  else body = { base64: response.body.toString('base64') };

  return { status: response.status, mediaType, headers: Object.fromEntries(comparedHeaders.map((name) => [name, header(name)])), body };
}

async function compareBehavior(dotnet: URL, node: URL): Promise<string[]> {
  const problems: string[] = [];
  for (const step of scenario) {
    const [fromDotnet, fromNode] = await Promise.all([observe(dotnet, step), observe(node, step)]);
    if (!isDeepStrictEqual(fromDotnet, fromNode))
      problems.push(`${step.name} (${step.method} ${step.path}):\n    .NET: ${json(fromDotnet)}\n    Node: ${json(fromNode)}`);
  }
  console.log(`Behavior: ${scenario.length} requests, ${scenario.length - problems.length} identical`);
  return problems;
}

const { values } = parseArgs({ options: { dotnet: { type: 'string' }, node: { type: 'string' } } });
const problems = compareRoutes();
if (values.dotnet !== undefined && values.node !== undefined)
  problems.push(...await compareBehavior(new URL(values.dotnet), new URL(values.node)));
else if (values.dotnet !== undefined || values.node !== undefined)
  throw new Error('Pass both --dotnet and --node to compare behavior.');

if (problems.length > 0) {
  console.error(`\nContract mismatches (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
} else console.log('Contract check passed.');
