# RK Health

Healthcare management platform with Groq AI, Google Sheets, and Flask backend.

## Deploy Backend (Render.com)

1. Push this repo to GitHub
2. Go to https://render.com → New Web Service → Connect your repo
3. Render will auto-detect `render.yaml`
4. Add these environment variables in Render dashboard:
   - `GROQ_API_KEY` — from https://console.groq.com/keys
   - `GAS_URL` — your deployed Google Apps Script URL
   - `TWILIO_ACCOUNT_SID` (optional, for SMS)
   - `TWILIO_AUTH_TOKEN` (optional)
   - `TWILIO_PHONE_NUMBER` (optional)
5. Deploy

## Deploy Frontend (GitHub Pages)

1. Go to repo Settings → Pages → Deploy from `master` / root
2. Update `config.js` → `FLASK_URL` to your Render URL (e.g. `https://rk-health-backend.onrender.com`)
3. Done

## Local Development

```bash
# Backend
cd backend
copy .env.example .env    # fill in your keys
pip install -r requirements.txt
python flask_server.py

# Frontend (in another terminal)
npx serve
```

Open http://localhost:3000
