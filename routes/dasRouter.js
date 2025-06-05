const express = require('express');
const router = express.Router();
const prisma = require("../prisma/client.js");

router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const recordings = await prisma.recording.findMany({
      where: {
        userId: userId,
        videoUrl: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.render("dashboard/dashboard", { user, recordings });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Server error");
  }
});

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const recording = await prisma.recording.findFirst({
      where: {
        roomId,
        userId,
        videoUrl: { not: null },
      },
    });

    if (!recording) {
      return res.status(404).render('404', { message: 'Recording not found or not processed yet.' });
    }

    res.render('dashboard/recordingDetails', { recording });
  } catch (error) {
    console.error('Error fetching recording by roomId:', error);
    res.status(500).send('Server error');
  }
});


module.exports = router;
