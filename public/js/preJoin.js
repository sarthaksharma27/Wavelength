const videoPreview = document.getElementById('video-preview');
const noVideoPlaceholder = document.getElementById('no-video-placeholder');
const qualityBadge = document.getElementById('quality-badge');
const mediaControls = document.getElementById('media-controls');
const micToggleBtn = document.getElementById('mic-toggle');
const cameraToggleBtn = document.getElementById('camera-toggle');
const allowAccessBtn = document.getElementById('allow-access-btn');
const joinStudioBtn = document.getElementById('join-studio-btn');
const effectsButton = document.getElementById('effects-button');

let stream = null;
let micEnabled = true;
let cameraEnabled = true;

async function requestMediaAccess() {
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: true
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;

        // Show actual video settings in qualityBadge
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        qualityBadge.textContent = `${settings.width || 1280}p / ${settings.frameRate || 30}fps`;

        noVideoPlaceholder.classList.add('hidden');
        videoPreview.classList.remove('hidden');
        qualityBadge.classList.remove('hidden');
        mediaControls.classList.remove('hidden');
        effectsButton.classList.remove('hidden');
        allowAccessBtn.classList.add('hidden');
        joinStudioBtn.classList.remove('hidden');
    } catch (error) {
        console.error('Media access failed:', error);
        alert('Camera/Mic access denied. Please check permissions.');
    }
}

function toggleMic() {
    if (!stream) return;
    const [audioTrack] = stream.getAudioTracks();
    if (audioTrack) {
        micEnabled = !micEnabled;
        audioTrack.enabled = micEnabled;
        micToggleBtn.style.backgroundColor = micEnabled ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.7)';
    }
}

function toggleCamera() {
    if (!stream) return;
    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack) {
        cameraEnabled = !cameraEnabled;
        videoTrack.enabled = cameraEnabled;
        cameraToggleBtn.style.backgroundColor = cameraEnabled ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.7)';
    }
}

function joinStudio() {
    if (!stream) {
        alert('Please allow camera and microphone access first.');
        return;
    }
    window.location.href = '/studio';
}

function applyEffects() {
    alert('Effects feature coming soon!');
}

allowAccessBtn.addEventListener('click', requestMediaAccess);
micToggleBtn.addEventListener('click', toggleMic);
cameraToggleBtn.addEventListener('click', toggleCamera);
joinStudioBtn.addEventListener('click', joinStudio);
effectsButton.addEventListener('click', applyEffects);
