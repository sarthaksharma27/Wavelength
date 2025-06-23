const localVideo = document.getElementById('local-video');
const inviteBtn = document.getElementById('invite-btn');
const closeButton = document.getElementById('closeButton');

const micBtn = document.querySelector('.control-button:nth-child(2)');
const camBtn = document.querySelector('.control-button:nth-child(3)');
const leaveBtn = document.querySelector('.control-button:nth-child(5)');

let localStream = null;
let micEnabled = true;
let camEnabled = true;

let peerConnection;
let isInitiator = false;

async function getTurnConfig() {
  const response = await fetch('/api/turn-credentials');
  const data = await response.json();

  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: data.urls,
        username: data.username,
        credential: data.credential
      }
    ]
  };
}

const socket = io();
const roomId = window.roomId;
const userId = window.userId;

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { max: 9999 },
        height: { max: 9999 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });

    localVideo.srcObject = localStream;

    // Log actual resolution received
    const track = localStream.getVideoTracks()[0];
    const settings = track.getSettings();
    console.log(`🎥 Local stream started: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
    
  } catch (err) {
    console.error('Failed to get user media:', err);
    alert('Could not access camera or microphone.');
  }
}

async function createPeerConnection() {
  const config = await getTurnConfig();
  peerConnection = new RTCPeerConnection(config);

  peerConnection.ontrack = (event) => {
    console.log('🎥 Remote track received:', event.streams[0]);
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
    } else {
      console.warn('remote-video element not found!');
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('📤 Sending ICE candidate:', event.candidate);
      socket.emit('ice-candidate', { roomId, candidate: event.candidate });
    }
  };

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  console.log('✅ PeerConnection created and local tracks added.');
}


async function createAndSendOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { roomId, offer });
    console.log('📤 Offer sent:', offer);
  } catch (err) {
    console.error('❌ Error creating or sending offer:', err);
  }
}

socket.on('offer', async ({ offer }) => {
  if (!peerConnection) {
    await createPeerConnection();
  }
  console.log('📥 Offer received');
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', { roomId, answer });
  console.log('📤 Answer sent');
});


socket.on('answer', async ({ answer }) => {
  if (!peerConnection) return;
  console.log('📥 Answer received');
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ candidate }) => {
  if (!peerConnection) return;
  try {
    console.log('📥 Received ICE candidate:', candidate);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error('❌ Error adding received ICE candidate:', err);
  }
});

function startCall() {
  createPeerConnection();
}

socket.on('ready', () => {
  if (isInitiator) {
    console.log('🟢 Peer is ready, sending offer...');
    createAndSendOffer();
  }
});

// ==== Signaling Events ====

socket.on('room-created', () => {
  isInitiator = true;
  console.log('🧭 You are the initiator.');
  startCall();
});

socket.on('room-joined', () => {
  isInitiator = false;
  console.log('🧭 You joined an existing room.');
  startCall(); 
  socket.emit('ready', roomId); 
});


socket.on('user-joined', userId => {
  console.log('👥 Another user joined:', userId);
  // No action needed.
});


// ==== Button Handlers ====

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
  const icon = micBtn.querySelector('.control-button-icon');
  icon.style.backgroundColor = micEnabled ? '#333' : '#ff5959';
}

function toggleCam() {
  if (!localStream) return;
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach(track => track.enabled = camEnabled);
  const icon = camBtn.querySelector('.control-button-icon');
  icon.style.backgroundColor = camEnabled ? '#333' : '#ff5959';
}

function leaveCall() {
  if (!localStream) return;
  localStream.getTracks().forEach(track => track.stop());
  localVideo.srcObject = null;
  localStream = null;
  alert('You have left the studio.');
}

const titleInput = document.getElementById('recording-title-input');
  titleInput.addEventListener('blur', async () => {
    const title = titleInput.value || 'Untitled Recording';

    await fetch('/studio/update-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomId, title })
    });
  });

// ==== Invite Button ====

inviteBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/generatetoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    });

    if (!res.ok) throw new Error("Failed to generate invite token");

    const data = await res.json();
    const inviteLink = `${window.location.origin}/studio/${roomId}?guestToken=${data.token}`;

    await navigator.clipboard.writeText(inviteLink);
    alert(`Invite link copied to clipboard:\n${inviteLink}`);
  } catch (err) {
    console.error('Failed to copy invite link:', err);
    alert("Something went wrong while generating invite link.");
  }
});

/////////////////////// Recording logic starte from here ///////////////////////////////////////

const recordBtn = document.getElementById('record-btn');
const recordBtnText = recordBtn.querySelector('.control-button-text');
const recordingSection = document.getElementById('recording-section');
let isHostRecording = false;

recordBtn.addEventListener('click', async () => {
  if (isHostRecording) {
    stopLocalRecording(); 
  } else {
    socket.emit("start-recording-request", roomId);
  }
});

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const recordingText = document.getElementById('recordingText');

function startCountdown(duration, callback) {
  countdownOverlay.classList.add('show');
  let count = duration;
  countdownNumber.textContent = count;
  countdownNumber.classList.add('countdown-pulse');

  const countdownInterval = setInterval(() => {
    count--;

    if (count >= 0) {
      countdownNumber.classList.remove('countdown-pulse');
      void countdownNumber.offsetWidth; // reflow
      countdownNumber.textContent = count;
      countdownNumber.classList.add('countdown-pulse');
    }

    if (count === 0) {
      clearInterval(countdownInterval);

      setTimeout(() => {
        countdownNumber.style.opacity = '0';
        recordingText.style.opacity = '1';

        // Delay a bit before calling actual recording function
        setTimeout(() => {
          countdownOverlay.classList.remove('show');
          // Reset state
          setTimeout(() => {
            countdownNumber.style.opacity = '1';
            recordingText.style.opacity = '0';
            countdownNumber.textContent = duration;
          }, 500);

          if (typeof callback === 'function') callback();
        }, 1000);
      }, 1000);
    }
  }, 1000);
}

// Socket flow integration
socket.on("start-recording", ({ startTime }) => {
  const delay = startTime - Date.now();

  if (delay > 0) {
    startCountdown(5, () => {
      startLocalRecording(); 
    });

    setTimeout(() => {
      startLocalRecording();
    }, delay);
  } else {
    startLocalRecording();
  }
});

let mediaRecorder;
let isUploading = false;
let chunkIndex = 0;
let recordingTimer = null;
const CHUNK_DURATION_MS = 5000;
const RESTART_DELAY_MS = 300;

let recordingStartTime = null;  // Global start timestamp of whole recording session
let currentChunkStartTime = 0;  // Relative start time of current chunk
let chunkRecordingStartTime = null;  // When current chunk started recording

function startLocalRecording() {
  recordBtnText.textContent = 'Stop';
  isHostRecording = true;

  if (isHostRecording) {
    recordingSection.classList.remove('hidden');
  }

  // Reset globals when starting fresh
  recordingStartTime = Date.now();
  currentChunkStartTime = 0;
  chunkIndex = 0;

  startNewRecorder();
}

function startNewRecorder() {
  // Don't start new recorder if recording has been stopped
  if (!isHostRecording) {
    return;
  }

  const options = {
    mimeType: 'video/webm;codecs=vp9,opus',
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 4000000,
  };

  mediaRecorder = new MediaRecorder(localStream, options);

  mediaRecorder.ondataavailable = function (event) {
    if (event.data.size > 0 && recordingStartTime && chunkRecordingStartTime) {
      chunkIndex++;

      // Calculate actual chunk duration
      const chunkEndTime = Date.now();
      const actualChunkDuration = chunkEndTime - chunkRecordingStartTime;
      
      // Calculate timestamps relative to recording start
      const startTime = currentChunkStartTime;
      const endTime = startTime + actualChunkDuration;
      
      // Update for next chunk
      currentChunkStartTime = endTime;

      const chunkBlob = event.data;

      const uploadingStatus = document.getElementById("uploadingStatus");
      const uploadingText = document.getElementById("uploadingText");
      uploadingStatus.style.display = "block";
      uploadingText.textContent = `Uploading chunk ${chunkIndex}…`;

      const formData = new FormData();
      formData.append("file", chunkBlob, `chunk-${chunkIndex}.webm`);
      formData.append("roomId", roomId);
      formData.append("userType", isInitiator ? "host" : "guest");
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);

      isUploading = true;

      fetch("/upload-chunk", {
        method: "POST",
        body: formData,
      }).then(() => {
        isUploading = false;
        uploadingStatus.style.display = "none";
      }).catch((err) => {
        console.error("Upload failed", err);
        isUploading = false;
        uploadingStatus.style.display = "none";
      });
    }
  };

  mediaRecorder.onstop = () => {
    // Only restart if recording is still active
    if (isHostRecording) {
      setTimeout(() => {
        startNewRecorder();
      }, RESTART_DELAY_MS);
    }
  };

  mediaRecorder.start();
  
  // Mark when this chunk started recording
  chunkRecordingStartTime = Date.now();

  // Stop this chunk after CHUNK_DURATION_MS to trigger new chunk creation
  recordingTimer = setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording" && isHostRecording) {
      mediaRecorder.stop();
    }
  }, CHUNK_DURATION_MS);
}

function stopLocalRecording() {
  // Prevent double stopping
  if (!isHostRecording) {
    return;
  }

  isHostRecording = false;
  recordBtnText.textContent = 'Record';
  
  // Emit stop signal to other participants 
 socket.emit("recording-stopped", { roomId, userId }); 


  // Clean up current recording
  cleanupRecording();

  recordingSection.classList.add('hidden');

  // alert("Recording has been stopped!");
  const uploadCompleteStatus = document.getElementById("uploadCompleteStatus");
  uploadCompleteStatus.style.display = "block";
}

function cleanupRecording() {
  // Stop chunk timer
  if (recordingTimer) {
    clearTimeout(recordingTimer);
    recordingTimer = null;
  }

  // Stop current recording if active
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  // Reset globals for next recording session
  recordingStartTime = null;
  currentChunkStartTime = 0;
  chunkRecordingStartTime = null;
}

// Close button event listener
closeButton.addEventListener('click', () => {
  const popup = document.getElementById('Completepopup');
  if (popup) {
    popup.style.display = 'none';
  }
});

socket.on("stop-rec", () => {
  // Only handle if currently recording
  if (!isHostRecording) {
    return;
  }

  // Stop recording without emitting signal (to prevent loop)
  isHostRecording = false;
  recordBtnText.textContent = 'Record';

  // Clean up recording but keep the video connection active
  cleanupRecording();

  // Hide recording section
  recordingSection.classList.add('hidden');

  const uploadingStatus = document.getElementById("uploadingStatus");
  const uploadingText = document.getElementById("uploadingText");

  uploadingStatus.style.display = "block";
  uploadingText.textContent = "Finalizing upload…";

  // Wait for all uploads to complete
  const checkUploadComplete = setInterval(() => {
    if (!isUploading) {
      clearInterval(checkUploadComplete);
      uploadingStatus.style.display = "none";
      console.log("All uploads completed.");
    }
  }, 500);
   
});

socket.on('job-completed', ({ jobId, roomId_MQ }) => {
  console.log(`Received job completion for roomId_MQ: ${roomId_MQ}, current roomId: ${roomId}`);
  
  
  if (roomId_MQ === roomId) {
    console.log(`Job completed for this room: ${roomId}`);
    const uploadCompleteStatus = document.getElementById("uploadCompleteStatus");
    if (uploadCompleteStatus) {
      uploadCompleteStatus.style.display = "none";
    }
    const completePopup = document.getElementById('Completepopup');
    if (completePopup) {
      completePopup.style.display = 'block';
    }
  } else {
    console.log(`Job completed for different room: ${roomId_MQ}, ignoring`);
  }
});


// ==== Init on Load ====

window.addEventListener('load', async () => {
  await startLocalStream();

  if (!roomId) {
    console.error('No roomId defined on window!');
    return;
  }

  console.log('Connecting to room:', roomId);
  socket.emit('join-room', roomId);
});

// ==== Button Listeners ====

micBtn.addEventListener('click', toggleMic);
camBtn.addEventListener('click', toggleCam);
leaveBtn.addEventListener('click', leaveCall);
