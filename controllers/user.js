const prisma = require('../prisma/client.js');
const { setUser } = require('../services/auth.js');

async function handleUserSignup(req, res) {
  const { username, email, password } = req.body;

  await prisma.user.create({
    data: {
      username,
      email,
      password,
    },
  });

  res.render("user/login");
}

async function handleUserLogin(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      email,
      password,
    },
  });

  if (!user) {
  console.log("No user found, redirecting to /signup");
  return res.redirect("/signup");
 }


  const token = setUser(user);
  res.cookie("uid", token);
  res.redirect("/dashboard");
}

module.exports = {
  handleUserSignup,
  handleUserLogin,
};
