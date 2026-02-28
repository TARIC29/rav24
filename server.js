const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const publicDir = path.join(__dirname, 'public');
const port = process.env.PORT || 3000;

const pendingApprovals = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  if (ext === '.js') {
    return 'application/javascript; charset=utf-8';
  }

  if (ext === '.css') {
    return 'text/css; charset=utf-8';
  }

  return 'text/html; charset=utf-8';
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier introuvable');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
}

function parseJsonBody(req, callback) {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e6) {
      req.destroy();
    }
  });

  req.on('end', () => {
    try {
      callback(null, JSON.parse(body || '{}'));
    } catch (error) {
      callback(error);
    }
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket.remoteAddress || null;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/client-info') {
    sendJson(res, 200, { ip: getClientIp(req) });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/login-status')) {
    const url = new URL(req.url, `http://localhost:${port}`);
    const requestId = url.searchParams.get('requestId');

    if (!requestId) {
      sendJson(res, 400, { message: 'requestId requis.' });
      return;
    }

    const record = pendingApprovals.get(requestId);
    if (!record) {
      sendJson(res, 404, { message: 'Demande introuvable.' });
      return;
    }

    sendJson(res, 200, {
      requestId,
      status: record.status,
      createdAt: record.createdAt,
      reviewedAt: record.reviewedAt || null
    });

    return;
  }

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
    parseJsonBody(req, (error, data) => {
      if (error) {
        sendJson(res, 400, { message: 'JSON invalide.' });
        return;
      }

      if (!data.ide || !data.pwd) {
        sendJson(res, 400, { message: 'Email et mot de passe requis.' });
        return;
      }

      const requestId = crypto.randomUUID();
      pendingApprovals.set(requestId, {
        ide: data.ide,
        ip: data.ip || getClientIp(req),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });

      sendJson(res, 202, {
        message: 'Demande reçue. Validation administrateur requise.',
        requestId,
        status: 'pending'
      });
    });

    return;
  }

  if (req.method === 'POST' && req.url === '/api/admin/approve') {
    parseJsonBody(req, (error, data) => {
      if (error || !data.requestId || !data.decision) {
        sendJson(res, 400, { message: 'requestId et decision sont requis.' });
        return;
      }

      const record = pendingApprovals.get(data.requestId);
      if (!record) {
        sendJson(res, 404, { message: 'Demande introuvable.' });
        return;
      }

      if (!['approved', 'rejected'].includes(data.decision)) {
        sendJson(res, 400, { message: 'decision doit être approved ou rejected.' });
        return;
      }

      record.status = data.decision;
      record.reviewedAt = new Date().toISOString();
      pendingApprovals.set(data.requestId, record);

      sendJson(res, 200, {
        message: `Demande ${data.decision}.`,
        requestId: data.requestId,
        status: record.status
      });
    });

    return;
  }



  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Route introuvable');
});

server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
