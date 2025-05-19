const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

async function restrictToLoggedinUserOnly(req, res, next) {
  const token = req.cookies.uid;
  const guestToken = req.query.guestToken;
  const roomId = req.params.roomId;

  try {
    if (token) {
      const verified = jwt.verify(token, 'Sarthak$123@$');
      req.user = verified;
      return next();
    }

    if (guestToken && roomId) {
      const guest = await prisma.guestToken.findUnique({ where: { token: guestToken } });

      if (guest && guest.roomId === roomId && new Date(guest.expiresAt) > new Date()) {
        req.guest = { token: guestToken };
        return next();
      }
    }

    return res.status(401).render("unauthorized");
  } catch (err) {
    return res.render("session");
  }
}

module.exports = restrictToLoggedinUserOnly;
