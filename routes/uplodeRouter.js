const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = multer();

router.post("/", upload.single("file"), async (req, res) => {
  const { roomId, userType, startTime, endTime } = req.body;
  const chunk = req.file;

  if (!chunk || !roomId || !userType || !startTime || !endTime) {
    return res.status(400).send("Missing required fields.");
  }

  const baseDir = path.join(__dirname, "recordings", roomId, userType);
  fs.mkdirSync(baseDir, { recursive: true });

  const chunkFilename = path.join(baseDir, chunk.originalname);
  fs.writeFileSync(chunkFilename, chunk.buffer);

  const metadataFile = path.join(baseDir, `${userType}.txt`);
  const metadataLine = `${chunk.originalname},${startTime},${endTime}\n`;
  fs.appendFileSync(metadataFile, metadataLine);

  console.log(`Saved: ${chunkFilename}`);
  return res.sendStatus(200);
});

module.exports = router;
