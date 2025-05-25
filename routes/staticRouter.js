const express = require('express');
const router = express.Router();

router.get("/", (req, res) => {
  res.render("dashboard/index");
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.get("/login", (req, res) => {
  res.render("user/login");
});

module.exports = router;
