// local_server.js - 本地測試用極簡 HTTP 伺服器 (免額外安裝 npm 套件)
const http = require('http');
const fs = require('fs');
const path = require('path');
const chatFunction = require('./netlify/functions/chat.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1. API 路由 (/api/chat 或 /.netlify/functions/chat)
  if (pathname === '/api/chat' || pathname === '/.netlify/functions/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const event = {
          httpMethod: req.method,
          headers: req.headers,
          body: body
        };

        // 清除快取，確保本地熱重載每次都執行最新程式碼
        delete require.cache[require.resolve('./netlify/functions/chat.js')];
        const freshChatFunction = require('./netlify/functions/chat.js');
        const result = await freshChatFunction.handler(event, {});

        res.writeHead(result.statusCode || 200, result.headers || {});
        res.end(result.body || '');
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      }
    });
    return;
  }

  // 2. 靜態檔案路由
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // 安全檢查防止目錄穿越
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 Fallback 到 index.html (SPA)
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Error loading file');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 101 數學家教系統 (本地伺服器) 已成功啟動！`);
  console.log(`👉 請在瀏覽器開啟: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
