// Aspire TypeScript AppHost: orchestrates the Node API and the Vite frontend for local development.
// It runs on Node (via tsx), so `aspire run` does not compile a native AppHost executable.
import { createBuilder } from './.aspire/modules/aspire.mjs';

const builder = await createBuilder();

// Aspire assigns the port and injects it as FOLIO_API_PORT; `npm run dev` restarts the API on change.
const api = await builder
  .addJavaScriptApp('api', '../backend/node', { runScriptName: 'dev' })
  .withNpm({ installCommand: 'ci' })
  .withHttpEndpoint({ env: 'FOLIO_API_PORT' })
  .withHttpHealthCheck({ path: '/api/health' });

// Forward an isolated database path, e.g. `FOLIO_DATABASE_PATH=/abs/path/folio.db aspire run`.
const databasePath = process.env.FOLIO_DATABASE_PATH?.trim();
if (databasePath) await api.withEnvironment('FOLIO_DATABASE_PATH', databasePath);

await builder
  .addViteApp('frontend', '../frontend')
  .withNpm({ installCommand: 'ci' })
  .withReference(api)
  .withEnvironment('FOLIO_API_URL', api.getEndpoint('http'))
  .withArgs(['--strictPort'])
  .waitFor(api)
  .withExternalHttpEndpoints();

await builder.build().run();
