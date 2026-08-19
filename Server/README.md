# LifeLine AI - Emergency Response Platform (Backend)

LifeLine AI is an AI-powered emergency response platform built for disaster response. This repository contains the modular backend foundation responsible for emergency intake, Gemini-powered AI analysis, deterministic priority scoring, responder dashboard APIs, triage tracking, and future AI vision integration.

---

## 🏗️ Architecture & Request Flow

The backend follows a clean, decoupled **Route → Controller → Service → Model** architecture pattern:

```
Responder Dashboard / Emergency Request
        │
        ▼
   [ Express App ]  (CORS, JSON parsing, Centralized Error Middleware)
        │
        ▼
   [ Route Layer ]  (src/routes/emergency.routes.js)
        │           • Route order: /stats & /active registered BEFORE /:id
        ▼
[ Query & Body Validation ] (src/middleware/validateEmergency.middleware.js)
        │                   • Query whitelist sanitization & limit capping
        ▼
 [ Controller Layer ] (src/controllers/emergency.controller.js)
        │
        ▼
  [ Emergency Service ] (src/services/emergency.service.js)
        │
        ├──► 1. [ Emergency AI Service ] (src/services/ai/emergencyAI.service.js)
        │         └─► [ Gemini Service ] (src/services/ai/gemini.service.js)
        │                 └─► Google GenAI SDK (`@google/genai`)
        │
        ├──► 2. [ Priority Engine ] (src/services/priority/priority.service.js)
        │         └─► Deterministic Score & Level Calculation
        │
        ├──► 3. [ Aggregation Engine ] (src/services/emergency.service.js)
        │         └─► Efficient MongoDB `$facet` Aggregations for Stats
        │
        ▼
 [ Database Model ] (src/models/Emergency.js) ──► [ MongoDB ]
```

---

## 📁 Modular Directory Structure

```
server/
├── scratch/
│   ├── test_priority.js          # Standalone priority engine test script
│   └── test_phase3.js            # Phase 3 dashboard & aggregation test script
├── src/
│   ├── config/
│   │   └── db.js                 # Reusable MongoDB connection handler
│   ├── controllers/
│   │   └── emergency.controller.js # Thin HTTP controllers
│   ├── middleware/
│   │   ├── errorHandler.middleware.js # Centralized error & 404 handlers
│   │   └── validateEmergency.middleware.js # Input & query validation middleware
│   ├── models/
│   │   └── Emergency.js          # Mongoose schema (indexes for status/priority/type)
│   ├── routes/
│   │   └── emergency.routes.js   # Route definitions (strict precedence)
│   ├── services/
│   │   ├── ai/
│   │   │   ├── gemini.service.js    # Base Google GenAI SDK client
│   │   │   └── emergencyAI.service.js # Prompt construction & JSON validation
│   │   ├── priority/
│   │   │   └── priority.service.js  # Deterministic Priority Scoring Engine
│   │   └── emergency.service.js  # Main orchestration, aggregations & queries
│   ├── utils/
│   │   ├── apiResponse.js        # Standardized API response formatters
│   │   └── asyncHandler.js       # Controller async wrapper utility
│   ├── app.js                    # Express app initialization & route binding
│   └── server.js                 # Entry point: dotenv load, DB connect & listen
├── .env                          # Environment variables (ignored in Git)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore file
├── package.json                  # Dependencies & scripts
└── README.md                     # Technical documentation
```

---

## 🚀 Getting Started

### 1. Installation

```bash
cd Server
npm install
```

### 2. Environment Setup

Configure `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifeline_ai
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Test Verification Scripts

```bash
# Test Priority Engine
node scratch/test_priority.js

# Test Responder Dashboard & Aggregations
node scratch/test_phase3.js
```

### 4. Start Development Server

```bash
npm run dev
```

---

## 📡 API Reference - Emergency Module & Responder Dashboard

All endpoints return a consistent JSON envelope structure:
- **Success (`200 OK` / `201 Created`)**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error (`400 Bad Request` / `404 Not Found` / `500 Error`)**: `{ "success": false, "message": "...", "errors": [...] }`

---

### 1. Get Responder Dashboard Statistics (`GET /api/emergencies/stats`)
- **HTTP Method**: `GET`
- **Endpoint**: `/api/emergencies/stats`
- **Description**: Returns aggregated metrics computed via MongoDB `$facet` aggregation pipelines.

**curl Command:**
```bash
curl -X GET http://localhost:5000/api/emergencies/stats
```

**Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Emergency statistics retrieved successfully",
  "data": {
    "total": 25,
    "active": 17,
    "resolved": 8,
    "critical": 4,
    "high": 6,
    "medium": 5,
    "low": 2,
    "byType": {
      "FIRE": 5,
      "MEDICAL": 8,
      "FLOOD": 7,
      "EARTHQUAKE": 0,
      "ACCIDENT": 5,
      "TRAIL_SEARCH": 0,
      "OTHER": 0
    }
  }
}
```

---

### 2. Get Active Emergencies (`GET /api/emergencies/active`)
- **HTTP Method**: `GET`
- **Endpoint**: `/api/emergencies/active`
- **Description**: Returns emergencies with active statuses (`REPORTED`, `INVESTIGATING`, `IN_PROGRESS`), sorted by `priorityScore` desc and `createdAt` desc.

**Query Parameters (Optional)**:
- `page`: default `1`
- `limit`: default `20` (max 50)
- `priority`: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`
- `emergencyType`: `FIRE` | `MEDICAL` | `FLOOD` | `EARTHQUAKE` | `ACCIDENT` | `TRAIL_SEARCH` | `OTHER`

**curl Command:**
```bash
curl -X GET "http://localhost:5000/api/emergencies/active?page=1&limit=10"
```

---

### 3. Get All Emergencies with Filtering & Sorting (`GET /api/emergencies`)
- **HTTP Method**: `GET`
- **Endpoint**: `/api/emergencies`

**Whitelisted Parameters**:
- `page`: default `1`
- `limit`: default `20` (max `50`)
- `status`: `REPORTED` | `INVESTIGATING` | `IN_PROGRESS` | `RESOLVED` | `DISMISSED`
- `priority` or `priorityLevel`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `emergencyType`: `FIRE` | `MEDICAL` | `FLOOD` | `EARTHQUAKE` | `ACCIDENT` | `TRAIL_SEARCH` | `OTHER`
- `sort`: `priority` (maps to `priorityScore`) | `createdAt` (default `priority`)
- `order`: `desc` | `asc` (default `desc`)

**curl Commands:**
```bash
# Filter by status and priority
curl -X GET "http://localhost:5000/api/emergencies?status=REPORTED&priority=CRITICAL"

# Filter by type with custom limit and sort
curl -X GET "http://localhost:5000/api/emergencies?emergencyType=FIRE&sort=priority&order=desc&page=1&limit=5"
```

---

### 4. Create Emergency Report (`POST /api/emergencies`)
- **HTTP Method**: `POST`
- **Endpoint**: `/api/emergencies`

**curl Command:**
```bash
curl -X POST http://localhost:5000/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Building fire reported, people trapped on roof",
    "emergencyType": "FIRE",
    "victimCount": 3,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }'
```

---

### 5. Get Emergency by ID (`GET /api/emergencies/:id`)
- **HTTP Method**: `GET`
- **Endpoint**: `/api/emergencies/:id`

**curl Command:**
```bash
curl -X GET http://localhost:5000/api/emergencies/66bc12a3b4c5d6e7f8901234
```

---

### 6. Update Emergency Status (`PATCH /api/emergencies/:id/status`)
- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/emergencies/:id/status`

**curl Command:**
```bash
curl -X PATCH http://localhost:5000/api/emergencies/66bc12a3b4c5d6e7f8901234/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

---

## 🛰️ Phase 7 & Phase 8 — Drone Video Intelligence & Visual Matching Pipeline

LifeLine AI integrates automated aerial drone search footage processing and visual matching to locate missing persons:

### Phase 7: Drone Video Upload & Person Detection
- **`POST /api/drone-videos`**: Upload search video (`MP4`, `MOV`, `WEBM`).
- **`GET /api/drone-videos`**: List uploaded drone videos.
- **`GET /api/drone-videos/:id`**: Fetch video details and processing status telemetry (`UPLOADED` ➔ `PROCESSING` ➔ `COMPLETED`).
- **`GET /api/drone-videos/:id/detections`**: Fetch candidate person sightings with bounding box coordinates `[x, y, w, h]`.

### Phase 8: Visual Feature Matching & Candidate Match Review
- **`POST /api/missing-persons/:id/search`**: Trigger visual comparison between a missing person's reference photograph and person crops extracted from a completed drone video.
- **`GET /api/missing-persons/:id/matches`**: Fetch ranked candidate match records sorted by similarity score (`similarityScore`).
- **`PATCH /api/matches/:id/status`**: Update responder review status (`PENDING_REVIEW` ➔ `CONFIRMED` | `REJECTED`).

### 🛡️ Safety & Human-In-The-Loop Rules
1. **No Automatic Identification**: Automated matching scores candidates (`Similarity: 0.87`) and marks status as `POSSIBLE_MATCH`.
2. **Explicit Responder Confirmation**: Confirming a match candidate sets `MatchCandidate.status -> CONFIRMED`. Changing a missing person case to `FOUND` requires an explicit, separate human responder decision (**MARK PERSON FOUND**).

