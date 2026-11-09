import { randomUUID } from 'node:crypto';
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { fontContentType, fontMessages, maximumFontBytes, readFontFamily } from './fonts.ts';
import { readProjectDocument } from './projectDocument.ts';
import type { FolioRepository } from './repository.ts';
import type { CurrentUserProvider } from './users.ts';

export const maximumRequestBytes = 100 * 1024 * 1024;

export interface AppOptions {
  readonly repository: FolioRepository;
  readonly currentUserProvider: CurrentUserProvider;
  /** Lower-case host names accepted in the Host header; undefined accepts any host. */
  readonly allowedHosts?: ReadonlySet<string>;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Handler = (request: IncomingMessage, response: ServerResponse, id: string) => Promise<void> | void;
type Routes = Partial<Record<Method, Handler>>;
export type RouteTable = Readonly<Record<string, Routes>>;

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, title: string) {
    super(title);
    this.status = status;
  }
}

const statusTitles: Readonly<Record<number, string>> = {
  400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 412: 'Precondition Failed',
  413: 'Payload Too Large', 415: 'Unsupported Media Type', 500: 'Internal Server Error',
};

// RFC 9110 token characters, matching the strictness of MediaTypeHeaderValue parsing closely enough for asset storage.
const mediaType = /^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+(\s*;\s*[!#$%&'*+.^_`|~0-9a-z-]+=("[^"]*"|[!#$%&'*+.^_`|~0-9a-z-]+))*\s*$/i;
const jsonMediaType = /^application\/([a-z0-9.+-]+\+)?json\s*(;|$)/i;

function problem(response: ServerResponse, status: number, title = statusTitles[status] ?? 'Error', detail?: string): void {
  const body = JSON.stringify(detail === undefined ? { title, status } : { title, status, detail });
  response.writeHead(status, { 'Content-Type': 'application/problem+json', 'Content-Length': Buffer.byteLength(body) });
  response.end(body);
}

function json(response: ServerResponse, body: string): void {
  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  response.end(body);
}

function noContent(response: ServerResponse): void {
  response.writeHead(204);
  response.end();
}

async function readBody(request: IncomingMessage, limit = maximumRequestBytes, tooLarge = 'Request exceeds the 100 MiB limit'): Promise<Buffer> {
  const declared = Number(request.headers['content-length'] ?? 0);
  if (declared > limit) throw new HttpError(413, tooLarge);
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request as AsyncIterable<Buffer | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.length;
    if (total > limit) throw new HttpError(413, tooLarge);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

const isCreateOnly = (request: IncomingMessage): boolean => String(request.headers['if-none-match'] ?? '').trim() === '*';

function hostName(host: string): string {
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0] ?? '';
  return name.toLowerCase();
}

// Decode the raw path segment exactly once so encoded slashes stay inside IDs
// and literal percent escapes are preserved.
function decodeId(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new HttpError(400, 'Invalid resource ID encoding');
  }
}

export function createRoutes({ repository, currentUserProvider }: AppOptions): RouteTable {
  const project: Routes = {
    GET: (_request, response, id) => {
      const document = repository.getProject(id);
      if (document === undefined) problem(response, 404);
      else json(response, document);
    },
    PUT: async (request, response, id) => {
      if (!jsonMediaType.test(request.headers['content-type'] ?? '')) return problem(response, 415);
      const raw = (await readBody(request)).toString('utf8').replace(/^\uFEFF/, '').trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return problem(response, 400, 'Invalid presentation', 'The request body is not valid JSON.');
      }
      const result = readProjectDocument(raw, parsed, id);
      if (!result.ok) return problem(response, 400, 'Invalid presentation', result.error);
      if (repository.saveProject(result.document, isCreateOnly(request))) noContent(response);
      else problem(response, 412, 'Project already exists');
    },
    DELETE: (_request, response, id) => {
      repository.deleteProject(id);
      noContent(response);
    },
  };

  const asset: Routes = {
    GET: (_request, response, id) => {
      const stored = repository.getAsset(id);
      if (stored === undefined) return problem(response, 404);
      response.writeHead(200, {
        'Content-Type': stored.contentType,
        'Content-Length': stored.content.byteLength,
        'X-Content-Type-Options': 'nosniff',
        // Never render user-controlled HTML/SVG as a document on the API origin.
        'Content-Disposition': "attachment; filename=asset; filename*=UTF-8''asset",
      });
      response.end(stored.content);
    },
    PUT: async (request, response, id) => {
      const contentType = request.headers['content-type'] ?? 'application/octet-stream';
      if (!mediaType.test(contentType)) return problem(response, 400, 'Invalid asset content type');
      const content = await readBody(request);
      if (repository.putAsset(id, contentType, content, isCreateOnly(request))) noContent(response);
      else problem(response, 412, 'Asset already exists');
    },
  };

  // Validation order matches FontsController: family name, declared size, font bytes, then duplicate family.
  const uploadFont: Handler = async (request, response) => {
    const family = readFontFamily(new URL(request.url ?? '/', 'http://localhost').searchParams.get('family'));
    if (family === undefined) return problem(response, 400, fontMessages.family);
    const content = await readBody(request, maximumFontBytes, fontMessages.tooLarge);
    const contentType = fontContentType(content);
    if (contentType === undefined) return problem(response, 400, fontMessages.format);
    const id = randomUUID().replaceAll('-', '');
    if (!repository.addFont(id, family, contentType, content)) return problem(response, 409, fontMessages.duplicate);
    const body = JSON.stringify({ id, family });
    response.writeHead(201, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      Location: `/api/fonts/${id}/content`,
    });
    response.end(body);
  };

  const fontContent: Routes = {
    GET: (_request, response, id) => {
      const font = repository.getFont(id);
      if (font === undefined) return problem(response, 404);
      response.writeHead(200, {
        'Content-Type': font.contentType,
        'Content-Length': font.content.byteLength,
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(font.content);
    },
  };

  const table: RouteTable = {
    '/api/health': { GET: (_request, response) => json(response, JSON.stringify({ status: 'ok' })) },
    '/api/users/me': {
      GET: async (_request, response) => json(response, JSON.stringify(await currentUserProvider.getCurrentUser())),
    },
    '/api/projects': { GET: (_request, response) => json(response, repository.listProjects()) },
    // Two segments so a project named "latest" remains retrievable.
    '/api/projects/latest/document': {
      GET: (_request, response) => {
        const document = repository.getLatestProject();
        if (document === undefined) problem(response, 404);
        else json(response, document);
      },
    },
    '/api/projects/{id}': project,
    '/api/assets/{id}': asset,
    '/api/fonts': {
      GET: (_request, response) => json(response, JSON.stringify(repository.listFonts())),
      POST: uploadFont,
      PUT: uploadFont,
    },
    '/api/fonts/{id}/content': fontContent,
  };
  return table;
}

/** Method/path pairs served by the API, e.g. `GET /api/projects/{id}`; used by the cross-backend contract check. */
export function listRoutes(table: RouteTable): { method: Method; path: string }[] {
  return Object.entries(table).flatMap(([path, routes]) =>
    (Object.keys(routes) as Method[]).map((method) => ({ method, path })));
}

// Literal segments match case-insensitively; `{name}` matches one nonempty raw segment.
// Patterns with fewer parameters win, as in ASP.NET routing.
function resolve(table: RouteTable, rawPath: string): { routes: Routes; id: string } | undefined {
  const trimmed = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  const segments = trimmed.split('/');
  const patterns = Object.keys(table).sort((a, b) => a.split('{').length - b.split('{').length);
  for (const pattern of patterns) {
    const parts = pattern.split('/');
    if (parts.length !== segments.length) continue;
    let id: string | undefined;
    const matches = parts.every((part, index) => {
      const segment = segments[index] ?? '';
      if (part.startsWith('{')) {
        id = segment;
        return segment !== '';
      }
      return part.toLowerCase() === segment.toLowerCase();
    });
    const routes = table[pattern];
    if (matches && routes !== undefined) return { routes, id: id === undefined ? '' : decodeId(id) };
  }
  return undefined;
}

export function createApp(options: AppOptions): RequestListener {
  const { allowedHosts } = options;
  const table = createRoutes(options);

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (allowedHosts !== undefined && !allowedHosts.has(hostName(request.headers.host ?? '')))
      return problem(response, 400, 'Invalid hostname');
    const rawUrl = request.url ?? '/';
    const queryStart = rawUrl.indexOf('?');
    const route = resolve(table, queryStart < 0 ? rawUrl : rawUrl.slice(0, queryStart));
    if (route === undefined) return problem(response, 404);
    const handler = route.routes[request.method as Method];
    if (handler === undefined) {
      response.setHeader('Allow', Object.keys(route.routes).join(', '));
      return problem(response, 405);
    }
    await handler(request, response, route.id);
  }

  return (request, response) => {
    handle(request, response).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (error instanceof HttpError) {
        // The client may still be uploading; close instead of draining an oversized body.
        if (error.status === 413) response.setHeader('Connection', 'close');
        problem(response, error.status, error.message);
        return;
      }
      console.error(error);
      problem(response, 500);
    });
  };
}
