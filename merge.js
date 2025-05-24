const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Fix: Point to correct recordings folder inside routes
const recordingsDir = path.join(__dirname, "routes", "recordings");

const ffmpeg = (cmd) => {
  console.log(`[ffmpeg] Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

function parseMetadata(filePath) {
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  return lines.map((line) => line.split(",")[0]);
}

function concatChunks(roomId, userType, outputPath) {
  const userDir = path.join(recordingsDir, roomId, userType);
  const metadataPath = path.join(userDir, `${userType}.txt`);

  console.log(`[concatChunks] Checking: ${metadataPath}`);

  if (!fs.existsSync(metadataPath)) {
    console.error(`[concatChunks] Metadata file missing: ${metadataPath}`);
    if (fs.existsSync(userDir)) {
      console.log(`[concatChunks] Files in ${userDir}:`, fs.readdirSync(userDir));
    }
    return null;
  }

  const chunks = parseMetadata(metadataPath);
  if (chunks.length === 0) {
    console.error(`[concatChunks] No chunks listed for ${userType}`);
    return null;
  }

  const listPath = path.join(userDir, `concat_list.txt`);
  const listFile = chunks.map(file => `file '${path.join(userDir, file).replace(/\\/g, "/")}'`).join("\n");

  fs.writeFileSync(listPath, listFile);

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
  ffmpeg(cmd);
  return outputPath;
}

function generateBlackVideo(outputPath, duration = 10, resolution = "640x360") {
  ffmpeg(`ffmpeg -y -f lavfi -i color=black:s=${resolution}:d=${duration} -f lavfi -i anullsrc -shortest -c:v libx264 -c:a aac "${outputPath}"`);
  return outputPath;
}

function mergeSideBySide(roomId, hostFile, guestFile, outputPath) {
  ffmpeg(`ffmpeg -y -i "${hostFile}" -i "${guestFile}" -filter_complex "[0:v]scale=640:360[hv];[1:v]scale=640:360[gv];[hv][gv]hstack=inputs=2[v];[0:a][1:a]amix=inputs=2[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac "${outputPath}"`);
}

async function startMerging(roomId) {
  console.log(`[startMerging] Starting for room: ${roomId}`);

  const outputDir = path.join(recordingsDir, roomId, "merged");
  fs.mkdirSync(outputDir, { recursive: true });

  const hostPath = path.join(outputDir, "host_full.mp4");
  const guestPath = path.join(outputDir, "guest_full.mp4");
  const finalOutput = path.join(outputDir, "final_combined.mp4");

  const hostExists = concatChunks(roomId, "host", hostPath);
  const guestExists = concatChunks(roomId, "guest", guestPath);

  if (!hostExists) {
    console.error("[startMerging] ❌ No host video found. Cannot proceed.");
    return;
  }

  let guestInput = guestPath;
  if (!guestExists) {
    console.log("[startMerging] ⚠ Guest video not found. Generating black screen placeholder.");

    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${hostPath}"`;
    const duration = parseFloat(execSync(durationCmd).toString().trim());

    const blackPath = path.join(outputDir, "guest_black.mp4");
    generateBlackVideo(blackPath, duration);
    guestInput = blackPath;
  }

  mergeSideBySide(roomId, hostPath, guestInput, finalOutput);
  console.log(`[startMerging] ✅ Merged video created at: ${finalOutput}`);
}

module.exports = { startMerging };
