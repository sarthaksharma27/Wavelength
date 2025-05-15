const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;
const { v4: uuidv4 } = require('uuid');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("index")
});

app.get('/pre', (req, res) => {
  res.render("preJoin")
});

app.get('/studio/:roomId', (req, res) => {
  res.render('studio', { roomId: req.params.roomId });
});

app.get('/studio', (req, res) => {
  const roomId = uuidv4();
  res.redirect(`/studio/${roomId}`);
});


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
