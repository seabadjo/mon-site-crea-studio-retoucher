const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const root = __dirname;
const testimonialsPath = path.join(root, 'data', 'testimonials.json');

function readTestimonials() {
  try {
    return JSON.parse(fs.readFileSync(testimonialsPath, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeTestimonials(data) {
  fs.writeFileSync(testimonialsPath, JSON.stringify(data, null, 2));
}

function makeReference() {
  return `REF-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
  };
  return types[ext] || 'application/octet-stream';
}

function serveStaticFile(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  safePath = safePath.replace(/^\/+/, '');
  if (!safePath) safePath = 'index.html';

  const resolvedPath = path.resolve(root, safePath);
  if (!resolvedPath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return true;
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return false;
  }

  res.writeHead(200, { 'Content-Type': getContentType(resolvedPath) });
  fs.createReadStream(resolvedPath).pipe(res);
  return true;
}

function handler(req, res) {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/testimonials' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(readTestimonials()));
    return;
  }

  if (pathname === '/api/testimonials' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const current = readTestimonials();
        const updated = Array.isArray(data) ? data : [...current, data];
        writeTestimonials(updated);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(updated));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  if (pathname === '/api/testimonials' && req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        writeTestimonials(Array.isArray(data) ? data : []);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(readTestimonials()));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  if (pathname === '/api/devis' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          success: true,
          ref: makeReference(),
          message: 'Devis reçu',
          payload,
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  if (serveStaticFile(req, res, pathname)) {
    return;
  }

  if (pathname !== '/favicon.ico') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('favicon not found');
  }
}

if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(3000, () => {
    console.log('Backend testimonials running on http://localhost:3000');
  });
}

module.exports = handler;
