// Máy chủ giả lập Google Apps Script để thử gửi đánh giá khi chưa có Google Sheet:
//   1) node scripts/mock-sheet-server.mjs            (hoặc: npm run mock:sheet)
//   2) đặt VITE_APPS_SCRIPT_URL=http://localhost:8788/exec trong file .env.local rồi chạy lại `npm run dev`
//   3) làm hết một lượt demo và bấm "Gửi đánh giá" — dữ liệu sẽ in ra ở cửa sổ này.
// Cố tình KHÔNG gửi header CORS, giống Apps Script thật.
import http from 'node:http';

const PORT = Number(process.env.PORT || 8788);

http
  .createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        let parsed = body;
        try { parsed = JSON.parse(body); } catch { /* giữ nguyên chuỗi */ }
        console.log(`\n[${new Date().toLocaleTimeString('vi-VN')}] POST ${req.url} (content-type: ${req.headers['content-type']})`);
        console.log(JSON.stringify(parsed, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Mock Apps Script đang chạy. Gửi POST tới /exec.');
  })
  .listen(PORT, () => console.log(`Mock Apps Script: http://localhost:${PORT}/exec`));
