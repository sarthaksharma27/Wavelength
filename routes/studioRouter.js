const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require("../prisma/client.js");
const restrictToLoggedinUserOnly = require('../middleware/user.js');

router.get('/', restrictToLoggedinUserOnly, async (req, res) => {
  const roomId = uuidv4();
  const defaultTitle = "Untitled Recording";

  try {
    if (req.user && req.user.id) {
      // Fetch existing roomData (or default to empty array)
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { roomData: true },
      });

      const updatedRoomData = [...(user.roomData || []), { roomId, title: defaultTitle }];

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          roomData: updatedRoomData,
        },
      });
    }
  } catch (error) {
    console.error('Error saving roomData:', error);
  }

  res.redirect(`/studio/${roomId}`);
});

router.get('/:roomId', restrictToLoggedinUserOnly, async (req, res) => {
  const token = req.cookies.uid;
  if(token) { // logged in user
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
   res.render('studio/studio', { roomId: req.params.roomId, user });
  } else { // guest
    res.render('studio/studio', { roomId: req.params.roomId });
  }
  
});

// routes/rooms.js
router.post('/update-title', restrictToLoggedinUserOnly, async (req, res) => {
  const { roomId, title } = req.body;
  if (!roomId || !title) return res.status(400).json({ error: 'roomId and title required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const roomData = user.roomData || [];

    const index = roomData.findIndex(r => r.roomId === roomId);
    if (index >= 0) {
      roomData[index].title = title;
    } else {
      roomData.push({ roomId, title });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { roomData },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
