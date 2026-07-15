# RK Health - Presentation Guide

## Quick Start for Demo (No Backend Required)

1. Open `index.html` in your browser
2. Login with `demo` / `demo123`
3. Explore all features — everything works with localStorage

## Architecture Overview (For Presentation)

```
┌─────────────────────────────────────────────────────────┐
│                   RK Health Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Frontend (index.html)               │   │
│  │  HTML + CSS + JavaScript + Three.js (3D)         │   │
│  │  ├─ Login with 3D animated scene                 │   │
│  │  ├─ Dashboard with analytics                     │   │
│  │  ├─ Appointment CRUD + Calendar links            │   │
│  │  ├─ Medication CRUD + SMS triggers               │   │
│  │  ├─ AI Chatbot (symptom triage + diet plans)     │   │
│  │  └─ Reports with print/export                    │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│         ┌────────────────┼────────────────┐             │
│         ▼                ▼                ▼             │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐        │
│  │ Google     │  │ Python Flask  │  │ Browser  │        │
│  │ Apps       │  │ Server        │  │ Storage  │        │
│  │ Script     │  │               │  │ (Demo)   │        │
│  │ (Sheets)   │  │ ├─ Groq AI   │  │          │        │
│  │            │  │ ├─ Twilio    │  │          │        │
│  │ CRUD API   │  │ ├─ Calendar  │  │          │        │
│  └────────────┘  └──────────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Demo Mode vs Live Mode

| Feature | Demo Mode (default) | Live Mode |
|---------|-------------------|-----------|
| Data Storage | localStorage | Google Sheets (via GAS) |
| AI Summaries | Template-based | Groq LLaMA 3.3-70B |
| Chatbot | Rule-based logic | Groq LLaMA 3.3-70B |
| SMS Reminders | Not sent (UI only) | Twilio SMS |
| Calendar | Manual link | Auto-generated link |
| Setup Needed | None | API keys + deployment |

## Presentation Script

### Slide 1: Introduction (30 sec)
> "RK Health is an AI-powered healthcare management platform. It helps patients manage appointments, medications, health records, and visit summaries from one dashboard. The system uses HTML/CSS/JS frontend with Three.js 3D visuals, backed by Google Apps Script, Google Sheets, Python Flask, Groq AI, and Twilio."

### Slide 2: Demo - Dashboard (1 min)
> "The dashboard shows summary cards — appointments today, medicines pending, reports generated, AI summaries. The timeline shows recent activity, and quick action buttons let you add appointments, medicines, ask the AI, or export reports."

### Slide 3: Appointments (1 min)
> "Add an appointment with patient name, doctor, date/time. The system saves it, generates an AI summary, and creates a Google Calendar link. Search and filter capabilities help manage records."

### Slide 4: Medications (1 min)
> "Track medications with dosage, timing, and phone number for SMS reminders. Toggle between active and completed status. In production, Twilio sends real SMS reminders."

### Slide 5: AI Chatbot (2 min)
> "The AI assistant has three modes:
> - **General**: Answer questions about the app
> - **Symptoms**: Collect symptoms, ask follow-up questions, recommend a specialist with urgency level
> - **Diet Plan**: Personalized meal plans based on goals and preferences
>
> *Crucial: The bot never diagnoses — it recommends specialists and urgency levels, and advises emergency care for critical symptoms.*"

### Slide 6: Reports (30 sec)
> "The reports page consolidates all health data — appointments, medications, compliance status, and AI summaries — in a printable format for sharing with doctors."

### Slide 7: Technical Architecture (1 min)
> "Frontend deployed on GitHub Pages. Backend uses Google Apps Script as a REST API connected to Google Sheets. Python Flask middleware handles AI (Groq LLaMA), SMS (Twilio), and Calendar integrations. The config.js toggle switches between demo and live mode."

### Slide 8: Key Differentiators (30 sec)
> "What makes this unique:
> - 3D animated login with Three.js
> - Glassmorphism UI design
> - AI symptom triage with specialty mapping (16 specialties)
> - Diet plan assistant with 5 goal types
> - Full CRUD with Google Sheets persistence
> - SMS and Calendar integrations"

## Deployment Checklist

### For GitHub Pages (Frontend)
```powershell
git init
git add .
git commit -m "Initial RK Health commit"
# Create GitHub repo, then:
git remote add origin https://github.com/YOUR_USER/rk-health.git
git branch -M main
git push -u origin main
# In GitHub repo Settings > Pages > deploy from main branch
```

### For Google Apps Script (Backend)
1. Go to script.google.com → New Project
2. Paste `backend/appsscript.gs` content
3. Deploy > New Deployment > Web App
4. Execute as: "Me", Access: "Anyone"
5. Copy the deployment URL into `config.js` as `GAS_URL`

### For Python Flask (Middleware)
```powershell
cd backend
pip install -r requirements.txt
# Edit .env with your API keys
python flask_server.py
```

## API Keys Needed (for Live Mode)
- **Groq**: https://console.groq.com/keys — for AI summaries and chatbot
- **Twilio**: https://console.twilio.com — for SMS reminders
- **Google Apps Script**: Free with Google account — for Sheets storage

## Project Files
```
rk-health/
├── index.html          # Main SPA frontend
├── styles.css          # Complete styling
├── script.js           # All application logic
├── config.js           # Demo/Live toggle + API URLs
├── backend/
│   ├── appsscript.gs   # Google Apps Script REST API
│   ├── flask_server.py # Python Flask server
│   ├── requirements.txt
│   └── .env.example    # Environment template
└── PRESENTATION_GUIDE.md
```
