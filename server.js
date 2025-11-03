// server.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, { cors: { origin: '*' } });
const xss = require('xss');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join(__dirname, 'messages.json');
const SAVE_HISTORY = true;

// Redirect root to welcome.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/welcome.html'));
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Health route
app.get('/health', (req, res) => res.json({ ok: true }));

// Load history
let history = [];
if (SAVE_HISTORY) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      history = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Could not read history:', e);
  }
}
function persist() {
  if (!SAVE_HISTORY) return;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history.slice(-200), null, 2));
  } catch (e) {
    console.error('Could not write history:', e);
  }
}

// Sockets
io.on('connection', (socket) => {
  // default name
  socket.data.username = `Guest-${socket.id.slice(0, 5)}`;

  // send last 30 messages
  socket.emit('history', history.slice(-30));

  // set name
  socket.on('set-username', (rawName) => {
    const name = xss(String(rawName || '').trim()).slice(0, 24) || socket.data.username;
    socket.data.username = name;
    socket.emit('system', { text: `Welcome, ${name}!` });
    socket.broadcast.emit('system', { text: `${name} joined the chat` });
  });

  // typing indicator
  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('typing', { user: socket.data.username, isTyping: !!isTyping });
  });

  // chat message
  socket.on('chat', (rawMsg) => {
    const clean = xss(String(rawMsg || '').slice(0, 500));
    if (!clean) return;
    const message = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      user: socket.data.username,
      text: clean,
      ts: Date.now(),
    };
    history.push(message);
    persist();
    io.emit('chat', message);
  });

  socket.on('disconnect', () => {
    io.emit('system', { text: `${socket.data.username} left` });
  });
});

//สั่งให้เริ่มฟังพอร์ต
http.listen(PORT, HOST, () => {
  console.log(`✅ Server listening on http://${HOST}:${PORT}`);
});
