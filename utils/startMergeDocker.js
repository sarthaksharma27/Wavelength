const { exec } = require("child_process");

function startMergeDocker(roomId) {
  const cmd = `docker run --rm \
  -v /c/Users/hp/X-project/Riverside-webrtc/routes/recordings:/app/recordings \
  -v /c/Users/hp/X-project/Riverside-webrtc/routes/temp:/app/temp \
  -v /c/Users/hp/X-project/Riverside-webrtc/routes/finals:/app/finals \
  ffmpeg-worker ${roomId}`;


  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Merge error:", err);
      return;
    }
    console.log("Merge complete 🎉:", stdout); 

    // uploadFinalToB2(roomId).then((url) => {
    //   io.to(roomId).emit("merge-complete", { videoUrl: url });
    // });
  });
}

module.exports = startMergeDocker;

