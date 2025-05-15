const express = require('express');
const path = require('path');
const app = express();
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("index")
});

app.get('/pre', (req, res) => {
  res.render("preJoin")
});

app.get('/studio/:roomId', (req, res) => {
  res.render('studio', { roomId: req.params.roomId });
});

app.get('/studio', (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/studio/${roomId}`);
});

io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', roomId => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
