const http = require('http');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const port = process.env.PORT || 3000;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier introuvable');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = ext === '.js' ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    const target = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.normalize(path.join(publicDir, target));

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Accès interdit');
      return;
    }

    serveStaticFile(res, filePath);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/login') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (!data.ide || !data.pwd) {
          sendJson(res, 400, { message: 'Email et mot de passe requis.' });
          return;
        }

        sendJson(res, 200, {
          message: `Données reçues pour ${data.ide}`,
          received: {
            ide: data.ide,
            persistent: Boolean(data.persistent)
          }
        });
      } catch (error) {
        sendJson(res, 400, { message: 'JSON invalide.' });
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Route introuvable');
});

server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
