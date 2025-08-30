// Configuration
const WIPE_DISTANCE_THRESHOLD = 50; // Pixel distance threshold for wiping
const RESET_TIMEOUT = 5000; // 5 seconds
const CLEANLINESS_THRESHOLD = 75;
const ALERT_COOLDOWN = 3600000; // 1 hour in ms

// EmailJS Configuration
emailjs.init('MzrFaP5Dip3y-4kuj');
const EMAILJS_SERVICE_ID = 'service_rkhzfcr';
const EMAILJS_TEMPLATE_ID = 'sanittrack_alert';

// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const cleanStatus = document.getElementById('clean-status');
const cleanTime = document.getElementById('clean-time');
const cleanPercent = document.getElementById('clean-percent');
const objectList = document.getElementById('object-list');
const reportBtn = document.getElementById('report-btn');
const alertBanner = document.getElementById('alert-banner');

// State variables
let seatStatus = "🚨 NEEDS CLEANING";
let lastCleaned = "Never";
let consecutiveDetections = 0;
let cleaningDetected = false;
let resetTimer = null;
let detectedObjects = [];
let cleanlinessScore = 50;
let lastAlertSent = 0;
let model = null;
let lastPositions = []; // For tracking hand movement history

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5
});

// Set up camera
function setupCamera() {
    navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false
    }).then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.play();
            detectFrame();
        };
    }).catch(err => {
        console.error("Camera error:", err);
        alert("Could not access the camera. Please ensure you've granted camera permissions.");
    });
}

// Main detection loop
function detectFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    hands.send({image: video}).then(results => {
        if (results.multiHandLandmarks) {
            console.log(`Hands detected: ${results.multiHandLandmarks.length}`);
            for (const landmarks of results.multiHandLandmarks) {
                drawHands(ctx, landmarks);
                detectWipingMotion(landmarks);
            }
        }
    });
    
    if (model && Date.now() % 2000 < 50) {
        detectObjects();
    }
    
    checkForAlerts();
    updateStatus();
    requestAnimationFrame(detectFrame);
}

// Draw hand landmarks with debug information
function drawHands(ctx, landmarks) {
    // Draw all landmarks with numbers
    ctx.fillStyle = 'red';
    landmarks.forEach((landmark, i) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(i.toString(), x + 10, y);
    });
    
    // Highlight wrist (0) and middle finger tip (12) in blue
    ctx.fillStyle = 'blue';
    [0, 12].forEach(i => {
        const lm = landmarks[i];
        const x = lm.x * canvas.width;
        const y = lm.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// Improved wiping detection using movement history
function detectWipingMotion(landmarks) {
    const wrist = landmarks[0];
    const currentPos = {
        x: wrist.x * canvas.width,
        y: wrist.y * canvas.height,
        time: Date.now()
    };

    // Store last 5 positions
    lastPositions.push(currentPos);
    if (lastPositions.length > 5) lastPositions.shift();

    if (lastPositions.length === 5) {
        // Calculate total movement distance over last 5 frames
        const totalMovement = lastPositions.slice(1).reduce((sum, pos, i) => {
            const dx = pos.x - lastPositions[i].x;
            const dy = pos.y - lastPositions[i].y;
            return sum + Math.sqrt(dx*dx + dy*dy);
        }, 0);

        console.log(`Movement distance: ${totalMovement.toFixed(1)}px`);

        if (totalMovement > WIPE_DISTANCE_THRESHOLD) {
            consecutiveDetections++;
            console.log(`Wiping detected (${consecutiveDetections}/3)`);
            if (consecutiveDetections >= 3 && !cleaningDetected) {
                cleaningDetected = true;
                seatStatus = "✅ CLEAN";
                lastCleaned = new Date().toLocaleTimeString();
                resetTimer = Date.now();
                cleanlinessScore = Math.min(100, cleanlinessScore + 20);
                console.log("Cleaning confirmed!");
            }
        } else {
            consecutiveDetections = Math.max(0, consecutiveDetections - 1);
        }

        // Reset status after timeout
        if (cleaningDetected && (Date.now() - resetTimer) > RESET_TIMEOUT) {
            cleaningDetected = false;
            seatStatus = "🚨 NEEDS CLEANING";
            consecutiveDetections = 0;
        }
    }
}

// Detect objects using COCO-SSD
async function detectObjects() {
    try {
        const predictions = await model.detect(video);
        detectedObjects = predictions.map(p => p.class);
        updateObjectList();
        
        // Decrease cleanliness when objects are detected
        if (detectedObjects.length > 0) {
            cleanlinessScore = Math.max(0, cleanlinessScore - 10);
        }
    } catch (err) {
        console.error("Object detection error:", err);
    }
}

// Update object list in UI
function updateObjectList() {
    objectList.innerHTML = '';
    if (detectedObjects.length === 0) {
        objectList.innerHTML = '<li>✅ No unnecessary objects detected</li>';
    } else {
        detectedObjects.forEach(obj => {
            const li = document.createElement('li');
            li.textContent = `🛠 ${obj}`;
            objectList.appendChild(li);
        });
    }
}

// Update status display
function updateStatus() {
    cleanStatus.textContent = seatStatus;
    cleanTime.textContent = lastCleaned;
    cleanPercent.textContent = `${cleanlinessScore}%`;
    
    // Change color based on cleanliness
    if (cleanlinessScore >= CLEANLINESS_THRESHOLD) {
        cleanPercent.style.color = 'green';
        cleanStatus.style.color = 'green';
    } else {
        cleanPercent.style.color = 'red';
        cleanStatus.style.color = 'red';
    }
}

// Check if we need to send automatic alerts
function checkForAlerts() {
    if (cleanlinessScore < CLEANLINESS_THRESHOLD && !cleaningDetected) {
        if (!lastAlertSent || (Date.now() - lastAlertSent) > ALERT_COOLDOWN) {
            sendEmailAlert();
            lastAlertSent = Date.now();
            
            // Show alert banner
            alertBanner.style.display = 'block';
            setTimeout(() => {
                alertBanner.style.display = 'none';
            }, 5000);
        }
    }
}

// Send email alert using EmailJS
function sendEmailAlert() {
    const templateParams = {
        cleanliness: cleanlinessScore,
        objects: detectedObjects.join(', '),
        status: seatStatus,
        last_cleaned: lastCleaned,
        to_email: 'mahendrasurvival@gmail.com'
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(() => {
            console.log('Email alert sent successfully!');
        }, (error) => {
            console.error('Failed to send email:', error);
        });
}

// Manual report button
reportBtn.addEventListener('click', () => {
    sendEmailAlert();
    alert('Manual report has been sent!');
});

// Initialize everything when page loads
window.addEventListener('load', async () => {
    try {
        model = await cocoSsd.load();
        console.log("Model loaded successfully");
        setupCamera();
    } catch (err) {
        console.error("Initialization error:", err);
        alert("Failed to initialize the application. Please check console for details.");
    }
});
