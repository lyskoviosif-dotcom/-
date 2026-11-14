const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => res.send('Stick Duel server is running'));

const rooms = {};

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [] };
    if (rooms[roomId].players.length >= 2) {
      socket.emit('roomFull');
      return;
    }
    const playerIndex = rooms[roomId].players.length;
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    socket.emit('playerIndex', playerIndex);
    io.to(roomId).emit('startGame', rooms[roomId].players);
  });

  socket.on('updatePlayer', (data) => {
    socket.to(data.room).emit('enemyUpdate', data);
  });

  socket.on('shoot', (data) => {
    socket.to(data.room).emit('enemyShoot', data);
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit('playerLeft');
        if (room.players.length === 0) delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер на порту ${PORT}`);
});
