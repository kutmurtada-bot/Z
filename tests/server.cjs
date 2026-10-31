const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'index (1).html');
const server = http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
server.listen(4173, '127.0.0.1');
