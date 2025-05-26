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
    // Check if response has already been sent
    if (!res.headersSent) {
        return res.status(400).send("Missing required fields.");
    }
    return; // Avoid further processing if headers sent
  }

  const chunkName = chunk.originalname;
  const cloudinaryChunkPath = `recordings/${roomId}/${userType}/${chunkName}`;
  const metadataFileName = `${userType}.txt`;
  const cloudinaryMetadataPath = `recordings/${roomId}/${userType}/${metadataFileName}`;

  try {
    // Promisify the upload_stream
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            public_id: cloudinaryChunkPath,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
            timeout: 60000 // Increase timeout to 60 seconds
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload stream error:", error);
              return reject(error); // Reject the promise on error
            }
            resolve(result); // Resolve the promise on success
          }
        );
        stream.end(chunk.buffer);
      });
    };

    // Await the stream upload
    await streamUpload();
    console.log(`✅ Chunk ${chunkName} uploaded to Cloudinary.`);

    // Metadata handling (proceeds only if chunk upload was successful)
    let existingTxt = "";
    try {
      // It's better to fetch metadata only if needed, or handle its absence gracefully
      const metadataUrl = cloudinary.url(cloudinaryMetadataPath, { resource_type: "raw", secure: true });
      const response = await fetch(metadataUrl);
      if (response.ok) {
        existingTxt = await response.text();
      } else if (response.status !== 404) {
        // Log error if it's not a 'file not found' error
        console.warn(`Metadata fetch issue for ${cloudinaryMetadataPath}: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      // This catch is for network errors during fetch, or if the file truly doesn't exist and fetch throws
      console.log(`No existing metadata file for ${cloudinaryMetadataPath}, or error fetching: ${err.message}`);
    }

    const updatedTxt = existingTxt + `${chunkName},${startTime},${endTime}\n`;
    const tmpPath = path.join(os.tmpdir(), `${userType}_${roomId}_${Date.now()}.txt`);
    await fs.writeFile(tmpPath, updatedTxt);

    await cloudinary.uploader.upload(tmpPath, {
      resource_type: "raw",
      public_id: cloudinaryMetadataPath,
      overwrite: true,
    });
    await fs.unlink(tmpPath); // Clean up temp file

    console.log(`✅ Uploaded chunk and updated metadata for: ${chunkName}`);
    if (!res.headersSent) {
        return res.status(200).send(`Successfully uploaded ${chunkName}`);
    }

  } catch (err) {
    console.error(`Upload process error for ${chunkName}:`, err);
    if (!res.headersSent) {
        // Check the type of error to provide a more specific message if it's a Cloudinary timeout
        if (err.name === 'TimeoutError' || (err.http_code === 499)) {
            return res.status(504).send("Chunk upload to Cloudinary timed out.");
        } else if (err.message && err.message.includes("ESOCKETTIMEDOUT")){
             return res.status(504).send("Chunk upload to Cloudinary timed out (socket).");
        }
        return res.status(500).send("Upload failed due to a server error.");
    }
  }
});

module.exports = router;
