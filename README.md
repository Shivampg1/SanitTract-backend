# SanitTract-backend

📌 Overview
This project implements a real-time hospital bed monitoring system using OpenCV, YOLO object detection, and MediaPipe hand tracking. It detects hand wiping movements to determine cleanliness and uses YOLO object detection to identify unnecessary objects on the bed. Additionally, it sends email reports with bed cleanliness analysis.

🚀 Features
Real-Time Hand Detection → Tracks motion to detect wiping action.

YOLO Object Detection → Identifies unnecessary objects on the bed. YOLO V8 is upgraded version

Cleanliness Analysis → Measures the cleanliness of the bed based on pixel thresholds.

Automated Email Reports → Sends cleanliness reports via email.

# SanitTrack: Hospital Surface Cleanliness Monitoring System �

![Hospital Cleanliness Monitoring](https://img.shields.io/badge/Status-Development-yellow) 
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![OpenCV](https://img.shields.io/badge/OpenCV-4.5%2B-orange)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-red)

SanitTrack is an AI-powered system that automatically monitors and verifies cleaning procedures in hospital environments by detecting wiping motions and sanitizing activities, then generates cleanliness reports.

## Features ✨

- **Wiping Motion Detection**: Uses MediaPipe to identify hand movements characteristic of cleaning
- **Surface Cleanliness Analysis**: Computer vision algorithms assess surface cleanliness percentage
- **Object Detection**: YOLOv8 model detects foreign objects on surfaces
- **Automated Reporting**: Email notifications with cleaning status and timestamps
- **Real-time Monitoring**: Live camera feed with status overlay

## Technology Stack 🛠️

- **Computer Vision**: OpenCV, MediaPipe
- **Object Detection**: YOLOv8 (Ultralytics implementation)
- **Email Integration**: SMTP with Gmail
- **Environment Management**: python-dotenv
