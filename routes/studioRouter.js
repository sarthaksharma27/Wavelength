const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require("../prisma/client.js");

router.get('/', (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/studio/${roomId}`);
});

router.get('/:roomId', async (req, res) => {
  const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
  res.render('studio', { roomId: req.params.roomId, user });
});

module.exports = router;
