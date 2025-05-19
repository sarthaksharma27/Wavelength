const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require("../prisma/client.js");
const restrictToLoggedinUserOnly = require('../middleware/user.js');

router.get('/', (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/studio/${roomId}`);
});

router.get('/:roomId', restrictToLoggedinUserOnly, async (req, res) => {
  const token = req.cookies.uid;
  if(token) { // which mean you are loged in user
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
   res.render('studio', { roomId: req.params.roomId, user });
  } else { // you are a guest
    res.render('studio', { roomId: req.params.roomId });
  }
  
});

module.exports = router;
