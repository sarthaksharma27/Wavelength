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

module.exports = router;
