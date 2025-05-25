const express = require('express');
const path = require('path');
const app = express();
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const cookieParser = require('cookie-parser');
const prisma = require("./prisma/client.js");
const { startMerging } = require('./merge.js');
require('dotenv').config();
const methodOverride = require('method-override');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));

const staticRouter = require('./routes/staticRouter.js');
const userRouter = require('./routes/userRouter.js');
const restrictToLoggedinUserOnly = require('./middleware/user.js');
const dasRouter = require('./routes/dasRouter.js');
const studioRouter = require('./routes/studioRouter.js');
const uplodeRouter = require('./routes/uplodeRouter.js')
const profileRouter = require('./routes/profileRouter.js')

app.use('/', staticRouter);
app.use('/user', userRouter);
app.use('/dashboard', restrictToLoggedinUserOnly, dasRouter);
app.use('/profile', restrictToLoggedinUserOnly, profileRouter);
app.use('/studio', studioRouter)
app.use('/upload-chunk', uplodeRouter)


app.get('/pre', restrictToLoggedinUserOnly, async (req, res) => {
  const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
  res.render("studio/preJoin", {user});
});

app.post('/generatetoken', async (req, res) => {
  const { roomId } = req.body;

  const token = uuidv4();

  await prisma.guestToken.create({
    data: {
      token,
      roomId,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
    },
  });

  res.json({ token });
});

app.use((req, res) => {
  res.status(404).render('404');
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

  socket.on("start-recording-request", (roomId) => {
    const startTime = Date.now() + 5000;
    io.to(roomId).emit("start-recording", { startTime });
  });

  socket.on("recording-stopped", (roomId) => {
  console.log(`[recording-stopped] triggered for room: ${roomId}`);
  io.to(roomId).emit("stop-rec");

  setTimeout(() => {
    console.log("Calling startMerging...");
    startMerging(roomId);
  }, 5000);
});



  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
