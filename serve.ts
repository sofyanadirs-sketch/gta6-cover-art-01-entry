// serve.ts — a tiny static file server for trying the app locally.
// Serves app/ at http://localhost:8080 (or the port in PORT / argv[2]).
// Node 22 standard library only; no network beyond localhost.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'app');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};


/** Resolve a request path inside app/, or null when it escapes it. */
function safePath(urlPath: string): string | null {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const joined = normalize(join(APP_DIR, clean === '/' ? 'index.html' : clean));
  if (joined !== APP_DIR && !joined.startsWith(APP_DIR + sep)) return null;
  return joined;
}

const server = createServer(async (req, res) => {
  try {
    const file = safePath(new URL(req.url || '/', 'http://localhost').pathname);
    if (file === null) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('Forbidden\n');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME_TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found\n');
  }
});

server.listen(PORT, () => {
  console.log(`Cover Studio serving app/ at http://localhost:${PORT}`);
});
