const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require("../prisma/client.js");
const restrictToLoggedinUserOnly = require('../middleware/user.js');

router.get('/', restrictToLoggedinUserOnly, async (req, res) => {
  const roomId = uuidv4();

  try {
    if (req.user && req.user.id) {
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          roomIds: {
            push: roomId,
          },
        },
      });
      // console.log('Updated user:', updatedUser);
    }
  } catch (error) {
    console.error('Error updating user with roomId:', error);
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

module.exports = router;
