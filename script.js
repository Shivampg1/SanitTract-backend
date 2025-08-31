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

// Chatbot Elements
const chatbotButton = document.getElementById('chatbot-button');
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendMessageBtn = document.getElementById('send-message');
const closeChatBtn = document.getElementById('close-chat');
const suggestionChips = document.getElementById('suggestion-chips');

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

// Hospital Data (Sample Data - You can replace with real data from your backend)
const hospitalData = {
    beds: {
        total: 150,
        available: 42,
        occupied: 108,
        icu: {
            total: 24,
            available: 8,
            occupied: 16
        },
        emergency: {
            total: 18,
            available: 5,
            occupied: 13
        }
    },
    doctors: {
        total: 56,
        available: 32,
        departments: {
            "Cardiology": {total: 8, available: 5},
            "Neurology": {total: 6, available: 4},
            "Pediatrics": {total: 10, available: 6},
            "Orthopedics": {total: 7, available: 4},
            "Emergency": {total: 12, available: 9},
            "Surgery": {total: 13, available: 4}
        }
    },
    medicine: {
        inStock: 1245,
        critical: [
            {name: "Insulin", stock: "Adequate"},
            {name: "Paracetamol", stock: "Adequate"},
            {name: "Amoxicillin", stock: "Low"},
            {name: "Salbutamol", stock: "Adequate"}
        ],
        lowStock: [
            {name: "Morphine", stock: "Very Low"},
            {name: "Propofol", stock: "Low"}
        ]
    }
};

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5
});

// Initialize chatbot
function initChatbot() {
    chatbotButton.addEventListener('click', toggleChatWindow);
    closeChatBtn.addEventListener('click', closeChatWindow);
    sendMessageBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add event listeners to suggestion chips
    const chips = suggestionChips.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            userInput.value = query;
            sendMessage();
        });
    });
}

// Toggle chat window visibility
function toggleChatWindow() {
    if (chatWindow.style.display === 'flex') {
        closeChatWindow();
    } else {
        openChatWindow();
    }
}

// Open chat window
function openChatWindow() {
    chatWindow.style.display = 'flex';
    userInput.focus();
}

// Close chat window
function closeChatWindow() {
    chatWindow.style.display = 'none';
}

// Send message function
function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';

    // Process the message and generate response
    setTimeout(() => {
        const response = generateResponse(message);
        addMessage(response, 'bot');
    }, 500);
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    
    if (sender === 'bot' && text.includes('<div')) {
        messageDiv.innerHTML = text;
    } else {
        messageDiv.textContent = text;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Generate response based on user query
function generateResponse(query) {
    query = query.toLowerCase();
    
    if (query.includes('bed') || query.includes('icu') || query.includes('emergency')) {
        return `
            <div class="info-card">
                <h4>Bed Availability</h4>
                <p><strong>Total Beds:</strong> ${hospitalData.beds.total}</p>
                <p><strong>Available Beds:</strong> ${hospitalData.beds.available}</p>
                <p><strong>Occupied Beds:</strong> ${hospitalData.beds.occupied}</p>
            </div>
            <div class="info-card">
                <h4>ICU Beds</h4>
                <p><strong>Total ICU:</strong> ${hospitalData.beds.icu.total}</p>
                <p><strong>Available ICU:</strong> ${hospitalData.beds.icu.available}</p>
                <p><strong>Occupied ICU:</strong> ${hospitalData.beds.icu.occupied}</p>
            </div>
            <div class="info-card">
                <h4>Emergency Beds</h4>
                <p><strong>Total Emergency:</strong> ${hospitalData.beds.emergency.total}</p>
                <p><strong>Available Emergency:</strong> ${hospitalData.beds.emergency.available}</p>
                <p><strong>Occupied Emergency:</strong> ${hospitalData.beds.emergency.occupied}</p>
            </div>
        `;
    } 
    else if (query.includes('doctor') || query.includes('doc')) {
        let departmentsHTML = '';
        for (const [dept, data] of Object.entries(hospitalData.doctors.departments)) {
            departmentsHTML += `
                <div class="info-card">
                    <h4>${dept}</h4>
                    <p><strong>Total Doctors:</strong> ${data.total}</p>
                    <p><strong>Available:</strong> ${data.available}</p>
                </div>
            `;
        }
        
        return `
            <div class="info-card">
                <h4>Doctors Summary</h4>
                <p><strong>Total Doctors:</strong> ${hospitalData.doctors.total}</p>
                <p><strong>Available Doctors:</strong> ${hospitalData.doctors.available}</p>
            </div>
            ${departmentsHTML}
        `;
    }
    else if (query.includes('medicine') || query.includes('medical') || query.includes('drug') || query.includes('pharma') || query.includes('stock')) {
        let criticalHTML = hospitalData.medicine.critical.map(item => 
            `<p><strong>${item.name}:</strong> ${item.stock}</p>`
        ).join('');
        
        let lowStockHTML = hospitalData.medicine.lowStock.map(item => 
            `<p><strong>${item.name}:</strong> ${item.stock}</p>`
        ).join('');
        
        return `
            <div class="info-card">
                <h4>Medicine Stock</h4>
                <p><strong>Total Medicines in Stock:</strong> ${hospitalData.medicine.inStock}</p>
            </div>
            <div class="info-card">
                <h4>Critical Medicines</h4>
                ${criticalHTML}
            </div>
            <div class="info-card">
                <h4>Low Stock Alert</h4>
                ${lowStockHTML}
            </div>
        `;
    }
    else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        return "Hello! I'm your hospital assistant. I can provide information about bed availability, doctors, and medical supplies.";
    }
    else {
        return "I'm not sure I understand. I can provide information about bed availability, doctors, and medical supplies. Please ask about one of these.";
    }
}

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
        initChatbot(); // Initialize the chatbot
    } catch (err) {
        console.error("Initialization error:", err);
        alert("Failed to initialize the application. Please check console for details.");
    }
});
