import path from 'node:path';

export interface Config {
  readonly hosts: readonly string[];
  readonly port: number;
  readonly databasePath: string;
  readonly allowedHosts: ReadonlySet<string> | undefined;
}

const backendRoot = path.resolve(import.meta.dirname, '..');

/**
 * Environment:
 * - FOLIO_API_HOST (default `localhost`, which listens on both 127.0.0.1 and ::1)
 * - FOLIO_API_PORT (default 5080)
 * - FOLIO_DATABASE_PATH (default `App_Data/folio.db`; relative paths resolve against `backend/node/`; `:memory:` for a throwaway database)
 * - FOLIO_ALLOWED_HOSTS (semicolon-separated Host header names, default `localhost;127.0.0.1;[::1]`; `*` accepts any)
 */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const host = env.FOLIO_API_HOST?.trim() || 'localhost';
  const port = Number(env.FOLIO_API_PORT ?? 5080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`Invalid FOLIO_API_PORT: ${env.FOLIO_API_PORT ?? ''}`);
  const allowed = env.FOLIO_ALLOWED_HOSTS?.trim() || 'localhost;127.0.0.1;[::1]';
  const database = env.FOLIO_DATABASE_PATH?.trim() || 'App_Data/folio.db';
  return {
    hosts: host === 'localhost' ? ['127.0.0.1', '::1'] : [host],
    port,
    databasePath: database === ':memory:' ? database : path.resolve(backendRoot, database),
    allowedHosts: allowed === '*'
      ? undefined
      : new Set(allowed.split(';').map((name) => name.trim().toLowerCase()).filter((name) => name !== '')),
  };
}
