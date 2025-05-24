const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

function generateConcatFile(roomId, userType) {
  const baseDir = path.join(__dirname, "routes", "recordings", roomId, userType);
  const files = fs.readdirSync(baseDir)
    .filter(f => f.endsWith(".webm"))
    .sort();

  if (files.length === 0) throw new Error(`${userType} has no chunks to merge`);

  const concatListPath = path.join(baseDir, "fileList.txt");
  const content = files.map(f => `file '${path.join(baseDir, f).replace(/\\/g, '/')}'`).join("\n");

  fs.writeFileSync(concatListPath, content);
  return concatListPath;
}

function mergeUserChunks(roomId, userType) {
  return new Promise((resolve, reject) => {
    const baseDir = path.join(__dirname, "routes", "recordings", roomId, userType);
    let concatFile;
    try {
      concatFile = generateConcatFile(roomId, userType);
    } catch (e) {
      return reject(e);
    }
    const outputFile = path.join(baseDir, `${userType}Merged.webm`);

    const cmd = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${outputFile}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error merging ${userType} chunks:`, stderr);
        return reject(error);
      }
      console.log(`${userType} chunks merged successfully to ${outputFile}`);
      resolve(outputFile);
    });
  });
}

function combineHostGuest(roomId, hostVideoPath, guestVideoPath) {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(__dirname, "routes", "recordings", roomId, "combined.webm");

    const cmd = `ffmpeg -i "${hostVideoPath}" -i "${guestVideoPath}" -filter_complex "[0:v]scale=iw/2:ih/2[left]; [1:v]scale=iw/2:ih/2[right]; [left][right]hstack=inputs=2[out]" -map "[out]" -c:v libvpx -crf 10 -b:v 1M "${outputFile}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Error combining host and guest videos:", stderr);
        return reject(error);
      }
      console.log("Combined video created at", outputFile);
      resolve(outputFile);
    });
  });
}

async function startMerging(roomId) {
  try {
    console.log(`Starting merge for room: ${roomId}`);
    const hostMerged = await mergeUserChunks(roomId, "host");
    const guestMerged = await mergeUserChunks(roomId, "guest");

    const combinedVideo = await combineHostGuest(roomId, hostMerged, guestMerged);

    console.log(`Merging complete for room ${roomId}. Combined file: ${combinedVideo}`);

    // Optional: notify clients here
  } catch (error) {
    console.error("Error during merging process:", error);
  }
}

module.exports = { startMerging };
