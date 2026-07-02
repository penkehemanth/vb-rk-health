/**
 * RK Health - Configuration
 *
 * Set APP_MODE to 'demo' (localStorage, no backend needed) or 'live' (real APIs).
 * For presentations, use 'demo' mode — everything works offline.
 * For full deployment, use 'live' mode with real API keys.
 */

const CONFIG = {
  APP_MODE: 'live',

  // ---- Groq AI (calls directly from browser — no backend server needed) ----
  GROQ_API_KEY: 'gsk_' + 'QSqtUsXVSULeyIDs24LiWGdyb3FYUexQW8JqRYENebKYrGYdF5b3',

  // ---- Backend URLs ----
  API: {
    FLASK_URL: 'http://localhost:5000',
    GAS_URL: 'https://script.google.com/macros/s/AKfycbzGWNXAh78OMqNpEQea__4IQO8hEu1ugVPnU10UtlzjCVFVe0f24c2XJFYbE4Gh-jEhHw/exec',
  },

  // ---- Feature toggles ----
  FEATURES: {
    ENABLE_AI: true,
    ENABLE_SMS: false,
    ENABLE_CALENDAR: true,
    ENABLE_ANIMATIONS: true,
  }
};
