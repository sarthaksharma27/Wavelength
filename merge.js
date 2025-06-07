require('dotenv').config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");
const cloudinary = require("./cloudConfig");

// Use temp directory for processing
const tempDir = os.tmpdir();

// Add polyfill for fetch if using older Node.js
const fetch = global.fetch || require('node-fetch');

function ffmpeg(command) {
  // First, try to find ffmpeg in the system
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch (error) {
    console.error('[ffmpeg] FFmpeg not found in PATH. Please ensure FFmpeg is installed and in your system PATH');
    console.error(`[ffmpeg] Current PATH: ${process.env.PATH}`);
    throw new Error('FFmpeg not found in system PATH');
  }

  console.log(`[ffmpeg] Running: ${command}`);
  
  try {
    // Use maxBuffer option to handle larger outputs
    return execSync(command, { 
      stdio: 'pipe',
      maxBuffer: 100 * 1024 * 1024 // 100MB buffer
    });
  } catch (error) {
    console.error('----------------------------------------');
    console.error(`[ffmpeg] Error executing command: ${command}`);
    console.error(`[ffmpeg] Error code: ${error.status}`);
    if (error.stdout) {
      console.error(`[ffmpeg] stdout: ${error.stdout.toString()}`);
    }
    if (error.stderr) {
      console.error(`[ffmpeg] stderr: ${error.stderr.toString()}`);
    }
    console.error('----------------------------------------');
    throw error;
  }
}

async function getChunksFromCloudinary(roomId, userType) {
  console.log(`[getChunks] Getting chunks for ${userType} in room ${roomId}`);
  
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 7000; // 7 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[getChunks] Attempt ${attempt}/${MAX_RETRIES} for ${userType} in room ${roomId}`);
      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: `recordings/${roomId}/${userType}/`,
        resource_type: 'video',
        max_results: 500
      });
      
      console.log(`[getChunks] Found ${resources.resources.length} video chunks on attempt ${attempt}`);
      
      if (resources.resources.length > 0) {
        // Extract filenames and sort them
        const chunks = resources.resources.map(resource => {
          const parts = resource.public_id.split('/');
          return {
            filename: parts[parts.length - 1],
            url: resource.secure_url,
            public_id: resource.public_id
          };
        }).sort((a, b) => {
          const numA = parseInt(a.filename.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.filename.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
        console.log(`[getChunks] Successfully fetched and sorted ${chunks.length} chunks for ${userType}.`);
        return chunks;
      }

      if (attempt < MAX_RETRIES) {
        console.log(`[getChunks] No chunks found for ${userType} on attempt ${attempt}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.log(`[getChunks] No video chunks found for ${userType} after ${MAX_RETRIES} attempts.`);
        return [];
      }
    } catch (error) {
      console.error(`[getChunks] Error retrieving chunks for ${userType} on attempt ${attempt}: ${error.message}`);
      if (attempt >= MAX_RETRIES) {
        console.error(`[getChunks] Failed to retrieve chunks for ${userType} after ${MAX_RETRIES} attempts.`);
        throw error; // Re-throw error after final attempt
      }
      // Optionally wait before retrying on error too, or handle specific errors differently
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); 
    }
  }
  return []; // Should be unreachable if loop logic is correct, but as a fallback
}

async function concatChunks(roomId, userType, outputPath) {
  console.log(`[concatChunks] Processing ${userType} for room ${roomId}`);

  const chunks = await getChunksFromCloudinary(roomId, userType);
  if (!chunks || chunks.length === 0) {
    console.error(`[concatChunks] No chunks found for ${userType}`);
    return null;
  }

  console.log(`[concatChunks] Found ${chunks.length} chunks to process`);

  // Create temp directory for chunks
  const tempUserDir = path.join(tempDir, roomId, userType);
  fs.mkdirSync(tempUserDir, { recursive: true });

  // Download all chunks
  for (const chunk of chunks) {
    const localPath = path.join(tempUserDir, chunk.filename);
    
    try {
      console.log(`[concatChunks] Downloading chunk: ${chunk.filename} from ${chunk.url}`);
      
      const response = await fetch(chunk.url);
      if (!response.ok) {
        throw new Error(`Failed to download chunk: ${response.status} ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buffer));
      console.log(`[concatChunks] Successfully downloaded: ${chunk.filename} (${buffer.byteLength} bytes)`);
    } catch (err) {
      console.error(`[concatChunks] Error downloading chunk ${chunk.filename}: ${err.message}`);
      return null;
    }
  }

  console.log(`[concatChunks] All chunks downloaded, preparing to concatenate`);

  // Create concat list
  const listPath = path.join(tempUserDir, "concat_list.txt");
  const listFile = chunks.map(chunk => 
    `file '${path.join(tempUserDir, chunk.filename).replace(/\\/g, "/")}'`
  ).join("\n");
  
  fs.writeFileSync(listPath, listFile);
  console.log(`[concatChunks] Created concat list with ${chunks.length} entries`);

  // Concatenate chunks
  console.log(`[concatChunks] Running ffmpeg to concatenate chunks`);
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
  ffmpeg(cmd);

  // Cleanup temp files
  console.log(`[concatChunks] Cleaning up temporary files`);
  fs.rmSync(tempUserDir, { recursive: true, force: true });

  console.log(`[concatChunks] Successfully processed all chunks for ${userType}`);
  return outputPath;
}

function generateBlackVideo(outputPath, duration = 10, resolution = "640x360") {
  ffmpeg(`ffmpeg -y -f lavfi -i color=black:s=${resolution}:d=${duration} -f lavfi -i anullsrc -shortest -c:v libx264 -c:a aac "${outputPath}"`);
  return outputPath;
}

function mergeSideBySide(roomId, hostFile, guestFile, outputPath) {
  console.log('[mergeSideBySide] Starting merge process');
  ffmpeg(`ffmpeg -y -i "${hostFile}" -i "${guestFile}" -filter_complex "[0:v]scale=960:1080[hv];[1:v]scale=960:1080[gv];[hv][gv]hstack=inputs=2[v];[0:a][1:a]amix=inputs=2[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac "${outputPath}"`);
  console.log('[mergeSideBySide] Finished merge process');
}


async function startMerging(roomId) {
  console.log(`[startMerging] Starting for room: ${roomId}`);

  // Create temp directory for output
  const outputDir = path.join(tempDir, roomId, "merged");
  fs.mkdirSync(outputDir, { recursive: true });

  const hostPath = path.join(outputDir, "host_full.mp4");
  const guestPath = path.join(outputDir, "guest_full.mp4");
  const finalOutput = path.join(outputDir, "final_combined.mp4");

  console.log(`[startMerging] Processing host video...`);
  const hostExists = await concatChunks(roomId, "host", hostPath);
  
  console.log(`[startMerging] Processing guest video...`);
  const guestExists = await concatChunks(roomId, "guest", guestPath);

  if (!hostExists) {
    console.error("[startMerging] ❌ No host video found. Cannot proceed.");
    return;
  }

  console.log(`[startMerging] Host video created successfully at: ${hostPath}`);
  
  let guestInput = guestPath;
  if (!guestExists) {
    console.log("[startMerging] ⚠ Guest video not found. Generating black screen placeholder.");

    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${hostPath}"`;
    const duration = parseFloat(execSync(durationCmd).toString().trim());

    const blackPath = path.join(outputDir, "guest_black.mp4");
    generateBlackVideo(blackPath, duration);
    guestInput = blackPath;
    console.log(`[startMerging] Created black video placeholder at: ${blackPath}`);
  } else {
    console.log(`[startMerging] Guest video created successfully at: ${guestPath}`);
  }

  console.log(`[startMerging] Merging videos side by side...`);
  try {
  mergeSideBySide(roomId, hostPath, guestInput, finalOutput);
  console.log(`[startMerging] Videos merged successfully at: ${finalOutput}`);
  } catch (error) {
    console.error('[startMerging] Error during mergeSideBySide:', error);
    return;
  }

  
  // Upload final video to Cloudinary
  try {
    const cloudinaryPath = `recordings/${roomId}/merged/final_combined.mp4`;
    console.log(`[startMerging] Uploading final video to Cloudinary: ${cloudinaryPath}`);
    
    const uploadResult = await new Promise((resolve, reject) => {
      let stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          public_id: cloudinaryPath,
          overwrite: true
        },
        (error, result) => {
          if (error) {
            console.error(`[startMerging] Upload error:`, error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      // Read the file in chunks and pipe to the upload stream
      const fileBuffer = fs.readFileSync(finalOutput);
      stream.end(fileBuffer);
    });
    
    console.log(`[startMerging] ✅ Final video uploaded to Cloudinary: ${uploadResult.secure_url}`);
    
    // Cleanup temp files
    console.log(`[startMerging] Cleaning up temporary files`);
    fs.rmSync(outputDir, { recursive: true, force: true });
    
    return uploadResult.secure_url;
  } catch (err) {
    console.error(`[startMerging] Error uploading final video: ${err.message}`);
    return null;
  }
}

module.exports = { startMerging };
