const express = require('express');
const router = express.Router();
const prisma = require("../prisma/client.js");

router.get("/", async (req, res) => {
  const userId = req.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
   res.render("dashboard/dashboard", {user});
});

module.exports = router;
