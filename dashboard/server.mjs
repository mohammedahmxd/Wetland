import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { contentSecurityPolicy, publicAuthConfig } from './public/auth-policy.js';

const root = resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/healthz') {
      send(res, 200, 'ok', { 'Content-Type': 'text/plain' });
      return;
    }
    if (path === '/auth/config') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' });
        return;
      }
      const config = publicAuthConfig(process.env);
      const body = JSON.stringify(config || { error: 'Sign-in is not configured' });
      send(res, config ? 200 : 503, req.method === 'HEAD' ? undefined : body, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      return;
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) {
      send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, '', { Allow: 'GET, HEAD' });
      return;
    }
    if (!(await stat(file)).isFile()) throw Error('Not found');
    const data = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? undefined : data, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': contentSecurityPolicy(process.env),
    });
  } catch {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
  }
}).listen(Number(process.env.PORT || 8080), '0.0.0.0');
