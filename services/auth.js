const jwt = require('jsonwebtoken');

const secret = process.env.SECRET_KEY;

function setUser(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    secret,
    {
      expiresIn: '7h',
    }
  );
}

module.exports = { setUser };
