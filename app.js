const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

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

app.get('/studio', (req, res) => {
  res.render("studio")
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
