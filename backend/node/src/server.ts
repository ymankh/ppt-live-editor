import { createServer, type Server } from 'node:http';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { FolioRepository } from './repository.ts';
import { localCurrentUserProvider } from './users.ts';

const config = loadConfig(process.env);
const repository = FolioRepository.open(config.databasePath);
const app = createApp({ repository, currentUserProvider: localCurrentUserProvider, allowedHosts: config.allowedHosts });

const servers: Server[] = config.hosts.map((host, index) => {
  const server = createServer(app);
  server.on('error', (error: NodeJS.ErrnoException) => {
    // "localhost" also binds ::1; tolerate machines without IPv6 loopback.
    if (index > 0 && host === '::1' && error.code === 'EADDRNOTAVAIL') {
      console.warn('IPv6 loopback unavailable; listening on 127.0.0.1 only.');
      return;
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(config.port, host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : config.port;
    console.log(`Folio API listening on http://${host.includes(':') ? `[${host}]` : host}:${port}`);
  });
  return server;
});
console.log(`Database: ${config.databasePath}`);

function shutdown(): void {
  for (const server of servers) server.close();
  repository.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
