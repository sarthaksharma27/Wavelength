const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require("../prisma/client.js");
const restrictToLoggedinUserOnly = require('../middleware/user.js');

// Route: Create new room and recording entry
router.get('/', restrictToLoggedinUserOnly, async (req, res) => {
  const roomId = uuidv4();
  const defaultTitle = "Untitled Recording";

  try {
    if (req.user && req.user.id) {
      await prisma.recording.create({
        data: {
          roomId,
          title: defaultTitle,
          userId: req.user.id,
        },
      });
    }

    res.redirect(`/studio/${roomId}`);
  } catch (error) {
    console.error('Error creating recording:', error);
    res.status(500).send('Internal server error');
  }
});

// Route: Render studio for specific room
router.get('/:roomId', restrictToLoggedinUserOnly, async (req, res) => {
  const token = req.cookies.uid;

  if (token) {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.render('studio/studio', { roomId: req.params.roomId, user });
  } else {
    res.render('studio/studio', { roomId: req.params.roomId });
  }
});

// Route: Update recording title (AJAX call from frontend)
router.post('/update-title', restrictToLoggedinUserOnly, async (req, res) => {
  const { roomId, title } = req.body;

  if (!roomId || !title) {
    return res.status(400).json({ error: 'roomId and title are required' });
  }

  try {
    // Make sure user owns this room
    const recording = await prisma.recording.findFirst({
      where: {
        roomId,
        userId: req.user.id,
      },
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found or not owned by user' });
    }

    await prisma.recording.update({
      where: { id: recording.id },
      data: { title },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating title:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
