# LifeLine AI - Public User Emergency App & Responder Command Center

This repository contains the complete frontend implementation for **LifeLine AI**:

1. **Public User Application**: A mobile-first, high-accessibility emergency intake and status tracking application for citizens in distress.
2. **Responder Command Center**: High-density Emergency Operations Center (EOC) dashboard for first responders.

---

## 🚀 Quick Start

### 1. Installation

```bash
cd Client
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server

```bash
npm run dev
```

Application will be served at **`http://localhost:5173`**

---

## 🗺️ Application Routes

- **`/`**: Public Landing Page (Headline, primary `REPORT EMERGENCY` button, missing persons module notice)
- **`/report`**: Public Emergency Reporting Form (Emergency type selector, description, victim count, trapped/injured toggles, GPS location detection)
- **`/report/:id`**: Public Incident Status Page (Live status timeline, priority badge, response status, 15s polling)
- **`/admin`** (or **`/dashboard`**): Responder Command Center (Active incidents table, aggregate statistics, filter bar, AI assessment drawer)

---

## 🔄 End-to-End Workflow

```
1. Citizen fills form on /report
        │
        ▼
2. Form posts payload to POST /api/emergencies
        │
        ▼
3. Backend executes Gemini AI Analysis + Deterministic Priority Engine
        │
        ▼
4. Saved document persisted in MongoDB & returns Incident ID
        │
        ▼
5. Citizen redirected to /report/:id showing Priority & Live Status
        │
        ▼
6. Responder opens /admin -> Emergency instantly appears in Active Incidents
        │
        ▼
7. Responder changes status to IN_PROGRESS / RESOLVED
        │
        ▼
8. Public page (/report/:id) automatically updates status via 15s polling
```
