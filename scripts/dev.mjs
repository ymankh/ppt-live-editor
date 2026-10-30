// Runs the Node API (with --watch) and the Vite dev server together; Ctrl+C stops both.
import { spawn } from 'node:child_process';

const apiUrl = process.env.FOLIO_API_URL ?? 'http://localhost:5080';
const processes = [
  { name: 'api', color: 36, args: ['--prefix', 'backend/node', 'run', 'dev'] },
  { name: 'web', color: 35, args: ['--prefix', 'frontend', 'run', 'dev'] },
];

let stopping = false;
const children = processes.map(({ name, color, args }) => {
  const child = spawn('npm', args, {
    env: { ...process.env, FOLIO_API_URL: apiUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.setEncoding('utf8');
    stream.on('data', (text) => {
      const lines = (pending + text).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.log(`${prefix}exited (${signal ?? code}); stopping.`);
      stop(code ?? 1);
    }
  });
  return child;
});

function stop(code) {
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
