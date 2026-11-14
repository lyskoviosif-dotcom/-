const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Простая комната на двоих
let players = {}; // socket.id -> { x, y, hp, weapon, facing, alive }
let scores = { p1: 0, p2: 0 };
let bullets = []; // серверные пули (для простоты — только позиции)

app.get('/', (req, res) => res.send('Stick Duel server is running'));

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // Первый игрок — синий, второй — красный
  const isFirst = Object.keys(players).length === 0;
  const playerId = isFirst ? 'p1' : 'p2';
  
  players[socket.id] = {
    id: playerId,
    x: isFirst ? 200 : 750,
    y: 400,
    hp: 100,
    weapon: 'ak47',
    facing: isFirst ? 1 : -1,
    alive: true,
    input: { left: false, right: false, jump: false, attack: false }
  };

  socket.emit('welcome', { playerId, state: { players, scores } });

  // Получаем ввод от игрока
  socket.on('input', (data) => {
    if (players[socket.id]) {
      players[socket.id].input = data;
    }
  });

  // Серверный игровой цикл (20 раз в секунду)
  const gameLoop = setInterval(() => {
    // Простая физика на сервере (упрощённо — только движение по X)
    for (const id in players) {
      const p = players[id];
      if (!p.alive) continue;
      if (p.input.left) { p.x -= 5; p.facing = -1; }
      if (p.input.right) { p.x += 5; p.facing = 1; }
      // Ограничиваем
      p.x = Math.max(0, Math.min(1000, p.x));
    }

    // Рассылаем состояние всем
    io.emit('state', { players, scores, bullets });
  }, 50);

  socket.on('disconnect', () => {
    console.log('Отключился:', socket.id);
    clearInterval(gameLoop);
    delete players[socket.id];
    if (Object.keys(players).length === 0) {
      scores = { p1: 0, p2: 0 };
      bullets = [];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер на порту ${PORT}`);
});