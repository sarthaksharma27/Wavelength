const localVideo = document.getElementById('local-video');
const inviteBtn = document.getElementById('invite-btn');

const micBtn = document.querySelector('.control-button:nth-child(2)');
const camBtn = document.querySelector('.control-button:nth-child(3)');
const leaveBtn = document.querySelector('.control-button:nth-child(5)');

let localStream = null;
let micEnabled = true;
let camEnabled = true;

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, frameRate: 30 },
      audio: true
    });
    localVideo.srcObject = localStream;
  } catch (err) {
    console.error('Failed to get user media:', err);
    alert('Could not access camera or microphone.');
  }
}

function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(track => (track.enabled = micEnabled));
  const icon = micBtn.querySelector('.control-button-icon');
  icon.style.backgroundColor = micEnabled ? '#333' : '#ff5959';  // #333 is your default dark bg
}

function toggleCam() {
  if (!localStream) return;
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach(track => (track.enabled = camEnabled));
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

inviteBtn.addEventListener('click', () => {
  const inviteLink = `${window.location.origin}/studio/${window.roomId}`;
  navigator.clipboard.writeText(inviteLink).then(() => {
    alert(`Invite link copied to clipboard:\n${inviteLink}`);
  }).catch(err => {
    console.error('Failed to copy invite link:', err);
  });
});

micBtn.addEventListener('click', toggleMic);
camBtn.addEventListener('click', toggleCam);
leaveBtn.addEventListener('click', leaveCall);

window.addEventListener('load', () => {
  startLocalStream();

  // Socket.IO client code - make sure /socket.io/socket.io.js is loaded in your HTML before this script
  const socket = io();
  const roomId = window.roomId;

  if (!roomId) {
    console.error('No roomId defined on window!');
    return;
  }

  console.log('Connecting to room:', roomId);
  socket.emit('join-room', roomId);

  socket.on('user-joined', userId => {
    console.log('Another user joined the room:', userId);
  });

  // Add other Socket.IO signaling handlers here later
});
