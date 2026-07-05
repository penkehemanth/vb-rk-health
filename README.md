# RK Health – AI Smart Patient Appointment & Medication Reminder System

RK Health is a production-ready, cloud-based healthcare management platform. It allows medical practitioners and patients to manage doctor appointments, medication schedules with SMS warnings, electronic health records (EHR), and AI-powered clinical summaries from a single beautiful dashboard.

---

## Key Features

1. **Dashboard & Metrics**: Visualizes patient visit numbers and medication compliance metrics with summary cards and timeline tracking.
2. **Secure Login**: Role-based authentication (Patient / Doctor / Admin) with registration, session persistence, and demo accounts.
3. **Appointment Scheduling**: Full CRUD with search and filter, Google Calendar link generation, and AI-generated visit summaries.
4. **Medication & SMS Alerts**: Dosage timers (Morning/Afternoon/Evening/Night), medication period tracking, and Twilio SMS integration.
5. **AI Chatbot**: Three modes — General Q&A, Symptom Triage (maps to 16+ specialties with urgency levels), and Personalized Diet Plans.
6. **AI Smart Clinical Summary**: Generates patient-friendly visit summaries using Groq's **llama-3.3-70b-versatile** model.
7. **Report Compiler**: Consolidates appointments, medications, compliance stats, and AI summaries into a print/PDF-ready report.
8. **Doctor Management**: Admin can add/edit/remove doctors with specialties, icons, and color coding.
9. **User Management**: Admin dashboard to promote users and create doctor accounts.
10. **Hybrid Storage**: Falls back to localStorage if no backend is configured — works immediately in any browser.
11. **3D Animated Login**: Three.js-powered medical-themed 3D scene on the login page.
12. **Dark Mode**: Toggle between light and dark themes.

---

## Project Structure

```
RK Health/
│
├── index.html              # Main SPA (login + dashboard + all pages)
├── README.md
├── render.yaml             # Render.com deployment config
├── .gitignore
├── .nojekyll               # GitHub Pages config
│
├── css/
│   └── styles.css          # Complete styling (glassmorphism, dark mode, responsive)
│
├── js/
│   ├── config.js           # API keys, mode toggles, feature flags
│   └── script.js           # All application logic (auth, CRUD, chatbot, 3D scene)
│
├── assets/
│   └── rk health img.png   # Login page background image
│
├── backend/
│   ├── appsscript.gs       # Google Apps Script REST API (Sheets CRUD)
│   ├── flask_server.py     # Python Flask middleware (Groq, Twilio, Calendar)
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
│
└── RK-HEALTH_Phase_Wise_Documents/   # Phase-wise project documentation
```

---

## Quick Start (No Backend Required)

1. Open `index.html` in your browser
2. Login with one of the demo accounts:
   - **Patient**: `demo` / `demo123`
   - **Admin**: `admin` / `admin123`
   - **Doctor**: `drsharma` / `doc123`
3. Explore all features — everything works with localStorage

---

## Deploy (GitHub Pages)

1. Go to repo **Settings → Pages → Branch: `master` → `/ (root)` → Save**
2. Wait 1-2 minutes, your site will be live at `https://penkehemanth.github.io/vb-rk-health/`
3. All features work: AI chatbot, summaries, appointments, meds, notifications, calendar links

---

## Backend Setup

### Google Apps Script (Database)

1. Create a Google Spreadsheet
2. Go to **Extensions → Apps Script**
3. Paste code from `backend/appsscript.gs`
4. Deploy as Web App (Execute as: "Me", Access: "Anyone")
5. Copy the deployment URL and set it as `GAS_URL` in `js/config.js`

### Python Flask Server (AI + SMS)

```bash
cd backend
copy .env.example .env    # fill in your API keys
pip install -r requirements.txt
python flask_server.py
```

Set `APP_MODE: 'live'` in `js/config.js` to connect.

---

## API Keys Needed (Live Mode)

| Service | Purpose | Get it at |
|---------|---------|-----------|
| Groq | AI summaries & chatbot | https://console.groq.com/keys |
| Twilio | SMS reminders | https://console.twilio.com |
| Google Apps Script | Sheets storage | Free with Google account |

---

## Demo Accounts

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Admin | Full access, user & doctor management |
| `demo` | `demo123` | Patient | Standard patient view |
| `drsharma` | `doc123` | Doctor | Dr. S. Sharma — General Physician |
| `drverma` | `doc123` | Doctor | Dr. R. Verma — Cardiologist |

---

## Tech Stack

- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript, Three.js (3D)
- **AI**: Groq LLaMA 3.3-70B (via API)
- **Backend**: Python Flask (optional middleware)
- **Database**: Google Sheets (via Apps Script) / localStorage (fallback)
- **SMS**: Twilio
- **Deploy**: GitHub Pages (frontend), Render.com (backend)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Frontend (index.html)           │
│  HTML + CSS + JS + Three.js (3D login)      │
│  ├─ Role-based auth (Patient/Doctor/Admin)  │
│  ├─ Dashboard with timeline & stats         │
│  ├─ Appointment CRUD + Calendar links       │
│  ├─ Medication CRUD + SMS triggers          │
│  ├─ AI Chatbot (symptom triage + diet)      │
│  └─ Reports with print/export               │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┼─────────────┐
         ▼         ▼             ▼
  ┌───────────┐ ┌────────┐ ┌──────────┐
  │ Google    │ │ Python │ │ Browser  │
  │ Apps      │ │ Flask  │ │ Storage  │
  │ Script    │ │ Server │ │ (Demo)   │
  │ (Sheets)  │ │ - Groq │ │          │
  │ CRUD API  │ │ - Twil │ │          │
  └───────────┘ └────────┘ └──────────┘
```
