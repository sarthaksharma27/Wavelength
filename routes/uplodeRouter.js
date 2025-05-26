const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = multer();

const cloudinary = require("../cloudConfig"); 
const fs = require("fs").promises;
const os = require("os");

router.post("/", upload.single("file"), async (req, res) => {
  const { roomId, userType, startTime, endTime } = req.body;
  const chunk = req.file;

  if (!chunk || !roomId || !userType || !startTime || !endTime) {
    return res.status(400).send("Missing required fields.");
  }

  const chunkName = chunk.originalname;
  const cloudinaryChunkPath = `recordings/${roomId}/${userType}/${chunkName}`;
  const metadataFileName = `${userType}.txt`;
  const cloudinaryMetadataPath = `recordings/${roomId}/${userType}/${metadataFileName}`;

  try {
    // ✅ Upload video chunk
    const uploadResult = await cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        public_id: cloudinaryChunkPath,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).send("Chunk upload failed.");
        }
      }
    );

    // Pipe chunk to Cloudinary stream
    const stream = uploadResult;
    stream.end(chunk.buffer);

    // ✅ Download or initialize metadata file
    let existingTxt = "";
    try {
      const metadataUrl = cloudinary.url(cloudinaryMetadataPath, { resource_type: "raw" });
      const response = await fetch(metadataUrl);
      if (response.ok) {
        existingTxt = await response.text();
      }
    } catch (err) {
      console.log("No existing metadata file, will create new.");
    }

    // ✅ Append new entry
    const updatedTxt = existingTxt + `${chunkName},${startTime},${endTime}\n`;

    // ✅ Save metadata file to tmp and upload to Cloudinary
    const tmpPath = path.join(os.tmpdir(), `${userType}_${roomId}.txt`);
    await fs.writeFile(tmpPath, updatedTxt);

    await cloudinary.uploader.upload(tmpPath, {
      resource_type: "raw",
      public_id: cloudinaryMetadataPath,
      overwrite: true,
    });

    console.log(`✅ Uploaded chunk and updated metadata for: ${chunkName}`);
    return res.sendStatus(200);
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).send("Upload failed.");
  }
});

module.exports = router;
