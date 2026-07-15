"""
RK Health - Python Flask Backend Server
Integrates: Groq AI / Ollama, Twilio SMS, Google Calendar, Google Sheets

Usage:
    pip install -r requirements.txt
    cp .env.example .env   # fill in your keys
    python flask_server.py
"""

import os
import json
import logging
import requests as http_req
from datetime import datetime
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS

# --- Load environment (explicit path to handle reloader CWD changes) ---
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)
AI_BACKEND = os.getenv('AI_BACKEND', 'groq').lower()
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')
GAS_URL = os.getenv('GAS_URL', '')

# --- Groq AI ---
groq_client = None
if AI_BACKEND == 'groq':
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
    except ImportError:
        groq_client = None

# --- Twilio ---
try:
    from twilio.rest import Client
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID else None
except ImportError:
    twilio_client = None

# --- Flask app ---
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('rk-health')

# ====== UNIFIED AI CHAT ======
def ai_chat(messages, temperature=0.7, max_tokens=1024):
    if AI_BACKEND == 'ollama':
        resp = http_req.post(f'{OLLAMA_URL}/api/chat', json={
            'model': OLLAMA_MODEL,
            'messages': messages,
            'stream': False,
            'options': { 'temperature': temperature }
        }, timeout=60)
        resp.raise_for_status()
        return resp.json()['message']['content']
    else:
        if not groq_client:
            raise Exception('Groq API not configured')
        response = groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

def ai_available():
    if AI_BACKEND == 'ollama':
        try:
            r = http_req.get(f'{OLLAMA_URL}/api/tags', timeout=5)
            return r.status_code == 200
        except:
            return False
    return groq_client is not None

def ai_name():
    if AI_BACKEND == 'ollama':
        return f'Ollama ({OLLAMA_MODEL})'
    return 'Groq (LLaMA 3.3-70B)'

# ==============================================================
#  HEALTH CHECK
# ==============================================================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'service': 'RK Health Flask Backend',
        'version': '1.0.0',
        'status': 'operational',
        'ai': { 'backend': AI_BACKEND, 'available': ai_available(), 'model': ai_name() },
        'integrations': {
            'groq': groq_client is not None,
            'ollama': AI_BACKEND == 'ollama',
            'twilio': twilio_client is not None,
            'gas': bool(GAS_URL)
        },
        'timestamp': datetime.now().isoformat()
    })


# ==============================================================
#  AI CHATBOT - Groq LLaMA 3.3-70B / Ollama
# ==============================================================
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    if not ai_available():
        return jsonify({'success': False, 'error': f'AI backend not available ({AI_BACKEND})'}), 503

    data = request.get_json(silent=True) or {}
    messages = data.get('messages', [])
    mode = data.get('mode', 'general')

    system_prompt = f"""You are the RK Health assistant, a friendly healthcare helper for patients.
Your job is to help users organize appointments, track medicines, generate visit summaries,
suggest the right doctor specialty based on symptoms, and provide general diet-plan ideas.

RULES:
- Do NOT claim to diagnose diseases. Do NOT replace a doctor.
- If symptoms sound urgent (chest pain, breathing difficulty, severe bleeding), advise immediate emergency care.
- Ask short follow-up questions when needed.
- Keep answers simple, calm, supportive, and easy to understand.
- For diet plans, give general meal suggestions based on user goals and preferences.
- For doctor recommendations, map symptoms to the most relevant specialty and explain why.
- For medication or health questions, encourage users to confirm with a licensed professional.

Current mode: {mode}.
If mode is 'symptom', focus on symptom collection and specialist referral.
If mode is 'diet', focus on meal planning and nutrition guidance.
If mode is 'general', handle any health management question."""

    full_messages = [{'role': 'system', 'content': system_prompt}]
    for msg in messages:
        full_messages.append({'role': msg.get('role', 'user'), 'content': msg.get('content', '')})

    try:
        reply = ai_chat(full_messages, temperature=0.7, max_tokens=1024)
        return jsonify({'success': True, 'reply': reply, 'mode': mode, 'ai_backend': AI_BACKEND})
    except Exception as e:
        logger.error(f'AI chatbot error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ==============================================================
#  AI SUMMARY GENERATOR
# ==============================================================
@app.route('/api/summarize', methods=['POST'])
def generate_summary():
    if not ai_available():
        return jsonify({'success': False, 'error': f'AI backend not available ({AI_BACKEND})'}), 503

    data = request.get_json(silent=True) or {}
    appt = data.get('appointment', {})

    prompt = f"""Generate a patient-friendly medical visit summary based on this data:

Patient Name: {appt.get('patient', 'Unknown')}
Doctor: {appt.get('doctor', 'Unknown')}
Date: {appt.get('date', 'Unknown')}
Visit Title: {appt.get('title', 'General Visit')}
Doctor's Notes: {appt.get('notes', 'No notes recorded')}

Please provide:
1. A short overview of the visit (2-3 sentences)
2. Key observations or findings
3. Recommended next steps
4. Follow-up advice

Write in plain, easy-to-understand language. Do NOT use alarmist language.
Format the response as plain text with clear sections."""

    try:
        summary = ai_chat([{'role': 'user', 'content': prompt}], temperature=0.5, max_tokens=512)
        return jsonify({'success': True, 'summary': summary, 'ai_backend': AI_BACKEND})
    except Exception as e:
        logger.error(f'AI summary error: {e}')
        fallback = (
            f"Visit Summary for {appt.get('patient', 'Patient')}\n\n"
            f"Dr. {appt.get('doctor', 'Doctor')} attended to {appt.get('patient', 'Patient')} "
            f"on {appt.get('date', 'scheduled date')} for {appt.get('title', 'a medical consultation')}.\n\n"
            f"{'Notes: ' + appt.get('notes', '') if appt.get('notes') else 'A routine consultation was conducted.'}\n\n"
            f"Recommended to follow the prescribed care plan and schedule a follow-up if needed."
        )
        return jsonify({'success': True, 'summary': fallback, 'fallback': True})


# ==============================================================
#  TWILIO SMS REMINDER
# ==============================================================
@app.route('/api/send-sms', methods=['POST'])
def send_sms():
    """
    Send an SMS reminder via Twilio.

    Request:  { "to": "+1234567890", "type": "medication|appointment", "details": {...} }
    Response: { "success": true, "messageSid": "..." }
    """
    if not twilio_client:
        return jsonify({'success': False, 'error': 'Twilio not configured'}), 503

    data = request.get_json(silent=True) or {}
    to = data.get('to', '').strip()
    reminder_type = data.get('type', 'medication')
    details = data.get('details', {})

    if not to:
        return jsonify({'success': False, 'error': 'Phone number is required'}), 400

    if reminder_type == 'medication':
        body = (
            f"RK Health Reminder: Time to take {details.get('name', 'your medication')} "
            f"({details.get('dosage', 'as prescribed')}) - {details.get('timing', '')}. "
            f"Stay healthy! Reply STOP to opt out."
        )
    elif reminder_type == 'appointment':
        body = (
            f"RK Health Reminder: You have an appointment with Dr. {details.get('doctor', 'your doctor')} "
            f"on {details.get('date', 'scheduled date')} at {details.get('time', 'scheduled time')}. "
            f"Title: {details.get('title', 'Medical Visit')}. Please arrive on time!"
        )
    else:
        body = (
            f"RK Health Reminder: {details.get('message', 'This is a health reminder from RK Health.')} "
            f"Stay healthy!"
        )

    try:
        message = twilio_client.messages.create(
            body=body,
            from_=TWILIO_PHONE_NUMBER,
            to=to
        )
        logger.info(f'SMS sent to {to}, SID: {message.sid}')
        return jsonify({
            'success': True,
            'messageSid': message.sid,
            'status': message.status,
            'to': to
        })
    except Exception as e:
        logger.error(f'Twilio error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ==============================================================
#  GOOGLE CALENDAR LINK GENERATOR
# ==============================================================
@app.route('/api/calendar-link', methods=['POST'])
def calendar_link():
    """
    Generate a Google Calendar event link.

    Request:  { "title": "...", "date": "2025-06-15", "time": "10:30",
                "doctor": "...", "patient": "...", "notes": "..." }
    Response: { "success": true, "url": "...", "eventDetails": {...} }
    """
    data = request.get_json(silent=True) or {}
    title = data.get('title', 'Medical Appointment')
    date_str = data.get('date', '')
    time_str = data.get('time', '10:00')
    doctor = data.get('doctor', 'Doctor')
    patient = data.get('patient', 'Patient')
    notes = data.get('notes', '')

    if not date_str:
        return jsonify({'success': False, 'error': 'Date is required'}), 400

    text = f'Appointment with Dr. {doctor}'
    details = f'Patient: {patient}\nDoctor: {doctor}\nNotes: {notes}'
    location = 'RK Health Center'

    try:
        start_dt = datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
    except ValueError:
        start_dt = datetime.strptime(f'{date_str} 10:00', '%Y-%m-%d %H:%M')

    end_dt = start_dt.replace(hour=start_dt.hour + 1)

    fmt = '%Y%m%dT%H%M%SZ'
    start_fmt = start_dt.strftime(fmt)
    end_fmt = end_dt.strftime(fmt)

    url = (
        f'https://calendar.google.com/calendar/render?action=TEMPLATE'
        f'&text={urllib_quote(text)}'
        f'&dates={start_fmt}/{end_fmt}'
        f'&details={urllib_quote(details)}'
        f'&location={urllib_quote(location)}'
    )

    return jsonify({
        'success': True,
        'url': url,
        'eventDetails': {
            'title': text,
            'start': start_fmt,
            'end': end_fmt,
            'location': location
        }
    })


def urllib_quote(s):
    from urllib.parse import quote
    return quote(s)


# ==============================================================
#  GOOGLE SHEETS PROXY (via Google Apps Script)
# ==============================================================
@app.route('/api/sheets/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def sheets_proxy(endpoint):
    """
    Proxy requests to Google Apps Script backend.
    Frontend can either call GAS directly or go through this proxy.
    """
    if not GAS_URL:
        return jsonify({'success': False, 'error': 'GAS URL not configured'}), 503

    try:
        method = request.method
        params = {}

        if method == 'GET':
            params = dict(request.args)
        else:
            body = request.get_json(silent=True) or {}
            params = {'data': json.dumps(body)}

        params['path'] = endpoint.replace('/', '/')

        if method == 'GET':
            resp = http_req.get(GAS_URL, params=params, timeout=15)
        else:
            resp = http_req.post(GAS_URL, params=params, timeout=15)

        return jsonify(resp.json())
    except Exception as e:
        logger.error(f'Sheets proxy error: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500


# ==============================================================
#  MAIN
# ==============================================================
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'

    logger.info('=' * 50)
    logger.info('RK Health Flask Backend')
    logger.info(f'AI Backend: {ai_name()} {"✓ Available" if ai_available() else "✗ Not available"}')
    logger.info(f'Twilio SMS: {"✓ Connected" if twilio_client else "✗ Not configured"}')
    logger.info(f'Google Sheets (GAS): {"✓ URL set" if GAS_URL else "✗ Not configured"}')
    logger.info(f'Server: http://0.0.0.0:{port}')
    logger.info('=' * 50)

    app.run(host='0.0.0.0', port=port, debug=debug)
