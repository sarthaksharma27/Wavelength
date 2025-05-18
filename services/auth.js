const jwt = require('jsonwebtoken');

const secret = "Sarthak$123@$";

function setUser(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    secret,
    {
      expiresIn: '1h',
    }
  );
}

module.exports = { setUser };
