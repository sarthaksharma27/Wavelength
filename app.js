const express = require('express');
const path = require('path');
const app = express();
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const staticRouter = require('./routes/staticRouter.js');
const userRouter = require('./routes/userRouter.js');
const restrictToLoggedinUserOnly = require('./middleware/user.js');
const dasRouter = require('./routes/dasRouter.js');

app.use('/', staticRouter);
app.use('/user', userRouter);
app.use('/dashboard', restrictToLoggedinUserOnly, dasRouter);


app.get('/pre', restrictToLoggedinUserOnly, (req, res) => {
  res.render("preJoin");
});

app.get('/studio/:roomId', restrictToLoggedinUserOnly, (req, res) => {
  res.render('studio', { roomId: req.params.roomId });
});

app.get('/studio', restrictToLoggedinUserOnly, (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/studio/${roomId}`);
});

io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', roomId => {
    socket.join(roomId);
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    console.log(`Socket ${socket.id} joined room ${roomId}. Clients in room: ${numClients}`);

    if (numClients === 1) {
      socket.emit('room-created');
    } else if (numClients === 2) {
      socket.emit('room-joined');
      socket.to(roomId).emit('user-joined', socket.id);
    } else {
      console.log(`Room ${roomId} has ${numClients} clients, which may exceed your max limit.`);
    }
  });

  socket.on('ready', roomId => {
    socket.to(roomId).emit('ready');
  });

  socket.on('offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('offer', { offer, roomId }); // Sent to everyone *except* sender
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('answer', { answer, roomId }); // Sent to everyone *except* sender
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
