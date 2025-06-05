import cv2
import numpy as np
import smtplib
from email.mime.text import MIMEText
from ultralytics import YOLO
import mediapipe as mp
from datetime import datetime
import time
from dotenv import load_dotenv
import os


load_dotenv()
RECEIVER_EMAIL = "kingjiqueen28@gmail.com"
SENDER_EMAIL = "hospitalityservice001@gmail.com"
SENDER_PASSWORD = "rtmk bpvj nrww fjtk"


try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    print(f"⚠️ Error Loading YOLO Model: {e}")
    exit()

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(min_detection_confidence=0.6, min_tracking_confidence=0.5, max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

CAMERA_INDEX = 0
WIPE_THRESHOLD = 0.10
RESET_TIMEOUT = 5000
DEBUG_MODE = True

cap = cv2.VideoCapture(CAMERA_INDEX)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
time.sleep(2)

seat_status = "🚨 NEEDS CLEANING"
last_cleaned = "Never"
consecutive_detections = 0
cleaning_detected = False
reset_timer = None

def detect_objects(frame):
    try:
        results = model(frame)[0]
        boxes = results.boxes
        object_list = [results.names[int(cls)] for cls in boxes.cls]
        return boxes, object_list
    except Exception as e:
        print(f"⚠️ Error in YOLO Object Detection: {e}")
        return [], []

def detect_cleanliness(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5,5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        clean_pixels = np.count_nonzero(thresh)
        total_pixels = frame.shape[0] * frame.shape[1]
        cleanliness_percent = (clean_pixels / total_pixels) * 100
        return cleanliness_percent
    except Exception as e:
        print(f"⚠️ Error in Cleanliness Detection: {e}")
        return 0

def send_email_report(cleanliness_percent, detected_objects, seat_status, last_cleaned):
    try:
        subject = "🚨 Hospital Bed Cleanliness & Motion Detection Report"
        object_summary = "\n".join([f"🛠 {obj}" for obj in detected_objects]) if detected_objects else "✅ No unnecessary objects detected!"
        message = f"""
        📊 Bed Cleanliness: {cleanliness_percent:.2f}%
        ✅ Status: {'Ready for use!' if cleanliness_percent > 75 else 'Needs more cleaning!'}
        
        🔎 *Unnecessary Objects Detected:*
        {object_summary}

        🧼 Seat Status: {seat_status}
        🕒 Last Cleaned: {last_cleaned}
        """

        msg = MIMEText(message)
        msg["Subject"] = subject
        msg["From"] = SENDER_EMAIL
        msg["To"] = RECEIVER_EMAIL

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, RECEIVER_EMAIL, msg.as_string())

        print("✅ Email Report Sent Successfully!")
    except Exception as e:
        print(f"⚠️ Error Sending Email: {e}")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera error - check connection")
        time.sleep(1)
        continue

    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_frame)

    current_motion = 0
    current_hands = 0

    if results.multi_hand_landmarks:
        landmarks = results.multi_hand_landmarks[0]
        wrist = landmarks.landmark[0]
        pinky = landmarks.landmark[20]
        current_motion = abs(wrist.x - pinky.x)
        current_hands = len(results.multi_hand_landmarks)

        mp_draw.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

        if current_motion > WIPE_THRESHOLD:
            consecutive_detections += 1
            if consecutive_detections >= 3 and not cleaning_detected:
                cleaning_detected = True
                seat_status = "✅ CLEAN"
                last_cleaned = datetime.now().strftime("%H:%M:%S")
                reset_timer = time.time()
        else:
            consecutive_detections = 0

    if cleaning_detected and (time.time() - reset_timer) > (RESET_TIMEOUT/1000):
        cleaning_detected = False
        seat_status = "🚨 NEEDS CLEANING"
        consecutive_detections = 0

    boxes, detected_objects = detect_objects(frame)
    cleanliness_percent = detect_cleanliness(frame)

    cv2.putText(frame, f"SEAT STATUS: {seat_status}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"Last cleaned: {last_cleaned}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    cv2.imshow("Hospital Monitoring System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

send_email_report(cleanliness_percent, detected_objects, seat_status, last_cleaned)

cap.release()
cv2.destroyAllWindows()
print("🛑 Webcam Closed Automatically")
