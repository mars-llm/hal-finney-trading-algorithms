import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mount = '/hal-finney-trading-algorithms/';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain', '.svg': 'image/svg+xml' };

export async function serveExport() {
  const root = await realpath(fileURLToPath(new URL('../../out/', import.meta.url)));
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!['GET', 'HEAD'].includes(req.method) || !pathname.startsWith(mount)) {
        res.writeHead(404).end(); return;
      }
      const relative = pathname.slice(mount.length) + (pathname.endsWith('/') ? 'index.html' : '');
      const file = await realpath(path.join(root, relative));
      if (!file.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: 'http://127.0.0.1:' + server.address().port + mount,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }),
  };
}
