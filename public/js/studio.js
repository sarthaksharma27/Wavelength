const localVideo = document.getElementById('local-video');

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

micBtn.addEventListener('click', toggleMic);
camBtn.addEventListener('click', toggleCam);
leaveBtn.addEventListener('click', leaveCall);

window.addEventListener('load', () => {
  startLocalStream();
});
