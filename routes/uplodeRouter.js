const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = multer();

router.post("/", upload.single("file"), async (req, res) => {
  const { sessionId, userType } = req.body;
  const chunk = req.file;

  if (!chunk || !sessionId || !userType) {
    return res.status(400).send("Missing required fields.");
  }

  const baseDir = path.join(__dirname, "recordings", sessionId, userType);

  // Create directory if not exists
  fs.mkdirSync(baseDir, { recursive: true });

  const filename = path.join(baseDir, chunk.originalname);

  // Save the file buffer to disk
  fs.writeFile(filename, chunk.buffer, (err) => {
    if (err) {
      console.error("Failed to save chunk:", err);
      return res.status(500).send("Error saving file.");
    }

    console.log(`Saved: ${filename}`);
    return res.sendStatus(200);
  });
});



module.exports = router;
