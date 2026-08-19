# 🚨 CrisisLink — AI-Powered Emergency Response & Search-and-Rescue Command Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb)
![PyTorch](https://img.shields.io/badge/PyTorch-ResNet18-EE4C2C?logo=pytorch)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google)

**CrisisLink** (powered by the *LifeLine AI* engine) is a next-generation disaster response and search-and-rescue command platform built for emergency responders, crisis management agencies, and public safety teams.

It bridges public incident reporting with **Google Gemini-driven risk assessment**, **YOLOv8 aerial drone computer vision**, **PyTorch ResNet-18 visual feature vector matching**, **Leaflet GIS mapping**, and **immutable audit timeline logging**.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [End-to-End System Architecture](#-end-to-end-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Setup](#-environment-setup)
- [Getting Started & Run Commands](#-getting-started--run-commands)
- [Live Camera Drone Search Simulation](#-live-camera-drone-search-simulation)
- [API Documentation](#-api-documentation)
- [Hackathon Presentation Flow](#-hackathon-presentation-flow)
- [License](#-license)

---

## ✨ Key Features

1. **AI Emergency Analysis & Priority Engine**:
   - Analyzes incoming public emergency reports using Google Gemini LLM (`@google/genai` / Groq API fallback).
   - Calculates a deterministic **0–100 Priority Score** and categorizes severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

2. **Responder Command Center Dashboard**:
   - High-density operational dashboard featuring active incident telemetry, live filters, status updates, and emergency triage.

3. **Public Incident Intake & Missing Person Portals**:
   - Citizen emergency reporting interface with instant AI feedback and tracking codes.
   - Missing person case registration with reference photo upload and geographic tracking.

4. **Aerial Drone Video Intelligence Pipeline**:
   - Asynchronous background video processor using OpenCV & Ultralytics YOLOv8 (`yolov8n.pt`) to extract candidate person detection frames from drone surveillance videos.

5. **Deep Visual Feature Vector Matching & Human-in-the-Loop Safeguard**:
   - Generates 512-dimensional visual embeddings using PyTorch ResNet-18 (`torchvision.models.resnet18`).
   - Ranks candidate aerial sightings using Cosine Similarity scoring ($\mathbf{v}_{\text{ref}} \cdot \mathbf{v}_{\text{crop}}$).
   - Side-by-side photo comparison review modal enforcing **Human-in-the-Loop** verification before confirming sightings.

6. **Interactive Search Operations Map & Case Audit Log**:
   - Leaflet + OpenStreetMap GIS map showing color-coded operational markers for Emergencies, Missing Persons, Drone Videos, Possible Sightings, and Confirmed Sightings.
   - Database-backed `CaseEvent` audit logging recording chronological milestones (`CASE_CREATED` ➔ `DRONE_VIDEO_UPLOADED` ➔ `VIDEO_PROCESSING_COMPLETED` ➔ `VISUAL_SEARCH_STARTED` ➔ `POSSIBLE_MATCH_CREATED` ➔ `MATCH_CONFIRMED`).

7. **Live Phone Camera Drone Simulation**:
   - Supports connecting mobile phone cameras via LAN Wi-Fi as active live search drones delivering real-time video frames and geolocation telemetry to the command center.

---

## 🏗️ End-to-End System Architecture

```
                                  CRISISLINK PLATFORM
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         │                                                                   │
   PUBLIC EMERGENCY REPORTING                                      MISSING PERSON CASE
         │                                                                   │
         ▼                                                           Reference Photograph
   [ Gemini 2.5 Flash AI ]                                                   │
   Risk Analysis & Severity                                                  │
         │                                                           SEARCH OPERATIONS
         ▼                                                                   │
   [ Priority Scoring Engine ]                                               ▼
   Deterministic 0-100 Score                                           Drone Search Video
         │                                                                   │
         ▼                                                                   ▼
   RESPONDER COMMAND CENTER                                          [ OpenCV + YOLOv8 ]
         │                                                        Person Detection Frames
         │                                                                   │
         │                                                                   ▼
         │                                                        [ PyTorch ResNet-18 ]
         │                                                    512D Embedding Comparison
         │                                                                   │
         │                                                                   ▼
         │                                                        Cosine Similarity Scoring
         │                                                         (e.g., Similarity: 0.81)
         │                                                                   │
         │                                                                   ▼
         │                                                         HUMAN RESPONDER REVIEW
         │                                                         (CONFIRM / REJECT MATCH)
         │                                                                   │
         └─────────────────────────────────┬─────────────────────────────────┘
                                           │
                                           ▼
                                  [ OPERATIONS GIS MAP ]
                               Leaflet + OpenStreetMap GIS
                                           │
                                           ▼
                                [ CHRONOLOGICAL AUDIT LOG ]
                              `CaseEvent` Database Audit Log
```

---

## 🛠️ Technology Stack

| Domain | Technology / Library |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, React Router DOM |
| **Styling & UI** | Modern Vanilla CSS, Glassmorphism design system, Lucide React icons |
| **GIS & Mapping** | Leaflet, React-Leaflet, OpenStreetMap Tiles |
| **Backend Runtime** | Node.js, Express.js (REST API architecture) |
| **Database** | MongoDB with Mongoose ORM |
| **AI & LLM Services** | Google Gemini 2.5 Flash (`@google/genai`), Groq SDK fallback |
| **Computer Vision** | OpenCV (`opencv-python`), Ultralytics YOLOv8 (`yolov8n.pt`) |
| **Deep Learning** | PyTorch (`torch`), Torchvision ResNet-18 (512D feature embeddings) |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |

---

## 📂 Project Directory Structure

```
CrisisLink/
├── Client/                      # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Modals, Navbars, Map Components, Badges
│   │   ├── context/            # AuthContext & State management
│   │   ├── pages/              # Command Center, Public Reports, Maps, Live Drone
│   │   ├── services/           # Axios API services
│   │   └── utils/              # Formatters & Offline Sync helpers
│   ├── package.json
│   └── vite.config.js
├── Server/                      # Express + Node.js Backend Server
│   ├── scratch/                # Python testing & validation scripts
│   ├── scripts/                # Database seeders & admin utility scripts
│   ├── src/
│   │   ├── config/             # MongoDB connection configuration
│   │   ├── controllers/        # Express Route Controllers
│   │   ├── middleware/         # Auth, Upload, Validation & Rate Limiting
│   │   ├── models/             # Mongoose Schemas (Emergency, MissingPerson, CaseEvent)
│   │   ├── routes/             # API Route Definitions
│   │   ├── scripts/            # YOLOv8 & PyTorch Python ML bridge scripts
│   │   ├── services/           # AI, Emergency, Matching & Timeline services
│   │   └── server.js           # Express App Entrypoint
│   ├── uploads/                # Uploaded videos, crops & injury reference photos
│   └── package.json
├── .gitignore                   # Workspace Git Ignore configuration
└── README.md                    # Project Documentation
```

---

## ⚡ Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI
- **Python**: 3.9+ with the following Python packages installed:
  ```bash
  pip install torch torchvision opencv-python ultralytics pillow numpy requests
  ```

---

## ⚙️ Environment Setup

### 1. Backend Environment (`Server/.env`)

Copy `Server/.env.example` to `Server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifeline_ai

# AI Model Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Drone Detection Configuration
VIDEO_FRAME_INTERVAL=1
PERSON_DETECTION_THRESHOLD=0.50
MAX_VIDEO_SIZE=104857600

# Visual Feature Matching Configuration
VISUAL_MATCH_THRESHOLD=0.70
TOP_K_MATCHES=5

# Admin Authentication Configuration
ADMIN_EMAIL=admin@lifeline.local
ADMIN_PASSWORD=admin123
JWT_SECRET=lifeline_jwt_secret_key_2026_super_secure
```

### 2. Frontend Environment (`Client/.env`)

Copy `Client/.env.example` to `Client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started & Run Commands

### 1. Start Backend Express Server
```bash
cd Server
npm install
npm run dev
```
*Server starts on `http://localhost:5000`*

### 2. Seed Database & Create Admin (Optional)
```bash
cd Server
node src/scripts/createAdmin.js
node scripts/resetData.js
```

### 3. Start Frontend Vite Client
```bash
cd Client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 📱 Live Camera Drone Search Simulation

You can turn any mobile smartphone on the same Wi-Fi network into a live search drone:

1. Connect laptop and mobile phone to the same Wi-Fi network.
2. Find your laptop's LAN IPv4 address (e.g. `192.168.1.100` via `ipconfig`).
3. Start Server (`npm run dev`) and Client (`npm run dev`).
4. On your mobile phone browser, navigate to: `http://<YOUR_LAPTOP_IP>:5173`.
5. Access **Command Center** ➔ **Drone Intelligence** ➔ **[ LIVE CAMERA ]**.
6. Tap **[ START CAMERA ]** and **[ START SEARCH ]** to stream camera video and location telemetry directly into the Command Center.

---

## 🔌 API Documentation

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health check & DB status | Public |
| `POST` | `/api/auth/login` | Admin authentication & JWT issue | Public |
| `GET` | `/api/auth/me` | Current authenticated admin profile | Protected |
| `POST` | `/api/emergencies` | Submit emergency incident report | Public |
| `POST` | `/api/emergencies/track` | Track emergency incident status | Public |
| `GET` | `/api/emergencies` | Fetch all emergencies with priority filtering | Protected |
| `POST` | `/api/missing-persons` | Register missing person case | Public |
| `POST` | `/api/drone-videos` | Upload drone video for YOLOv8 detection | Protected |
| `POST` | `/api/missing-persons/:id/search` | Execute PyTorch visual similarity matching | Protected |
| `GET` | `/api/missing-persons/:id/matches` | Retrieve candidate matches for case | Protected |
| `PATCH` | `/api/matches/:id/status` | Confirm or Reject match candidate | Protected |
| `GET` | `/api/operations/map` | Fetch operational GIS map markers | Protected |
| `GET` | `/api/cases/:id/timeline` | Fetch audit timeline for case | Protected |

---

## 🏆 Hackathon Presentation Flow

1. **Public Emergency Intake**: Submit an emergency report (e.g., *"Flash flood trapped survivors on rooftop"*). Demonstrate instant Gemini risk scoring and priority classification.
2. **Missing Person Registration**: Register a missing person with a reference photo and last known coordinates.
3. **Drone Video Upload & YOLO Processing**: Upload surveillance footage under **Drone Intelligence**. Show real-time extraction of person detection crops.
4. **PyTorch ResNet-18 Vector Search & Human Review**: Run visual search on the missing person case. View top matches with cosine similarity scores, open side-by-side comparison, and confirm the match.
5. **Operations Map & Audit Trail**: View real-time Leaflet GIS markers and open the case drawer to inspect the chronological `CaseEvent` audit trail.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
