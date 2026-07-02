# RK Health

AI-powered healthcare management platform with Groq AI, Google Calendar, and Google Sheets.

## Deploy (GitHub Pages — no server needed)

1. Go to repo **Settings → Pages → Branch: `master` → `/ (root)` → Save**
2. Wait 1-2 minutes, your site will be live at `https://penkehemanth.github.io/vb-rk-health/`
3. All features work: AI chatbot, summaries, appointments, meds, notifications, calendar links

## Local Development

```bash
npx serve
# Open http://localhost:3000
```

## Optional Backend (Flask + Render)

For Twilio SMS support, deploy `backend/flask_server.py` on Render.com:
```bash
cd backend
copy .env.example .env    # fill keys
pip install -r requirements.txt
python flask_server.py
```
