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

const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/testimonials' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(updated));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(readTestimonials()));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          success: true,
          ref: makeReference(),
          message: 'Devis reçu',
          payload,
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000, () => {
  console.log('Backend testimonials running on http://localhost:3000');
});
