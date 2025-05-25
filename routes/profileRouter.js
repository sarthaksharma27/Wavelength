const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');

router.get("/logout", (req, res) => {
    res.cookie("uid", "", {
    expires: new Date(0),
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Strict"
    });

    res.redirect("user/login");
});

router.get("/", (req, res) => {
    res.render("profile")
})

router.delete('/delete', async (req, res) => {
  const { password } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).send("User not found");

    if (user.password !== password) {
      return res.status(401).send("Incorrect password");
    }

    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie('uid');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


module.exports = router;