const express = require('express');
const { handleUserSignup, handleUserLogin } = require('../controllers/user.js');

const router = express.Router();

router.post("/login", handleUserLogin);
router.post("/signup", handleUserSignup);

module.exports = router;
