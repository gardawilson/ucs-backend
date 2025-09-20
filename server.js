require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const app = require('./src/app');
const { connectDb } = require('./src/core/config/db');
const getLocalIp = require('./src/core/utils/get-local-ip');

const port = process.env.PORT || 5002;
const host = '0.0.0.0'; // listen ke semua interface

// Buat HTTP server dari app express
const server = http.createServer(app);

// Setup WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  ws.send('Welcome to WebSocket server!');
  ws.on('close', () => console.log('Client disconnected'));
});

// Jalankan server
server.listen(port, host, () => {
  const ip = getLocalIp();

  console.log(`✅ Server berjalan:`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://${ip}:${port}`);

  // Connect ke DB setelah server ready
  connectDb();
});
