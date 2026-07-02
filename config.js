/**
 * RK Health - Configuration
 *
 * Set APP_MODE to 'demo' (localStorage, no backend needed) or 'live' (real APIs).
 * For presentations, use 'demo' mode — everything works offline.
 * For full deployment, use 'live' mode with real API keys.
 */

const CONFIG = {
  // ---- Mode: 'demo' | 'live' ----
  // 'live' = uses Flask server + Google Sheets. 'demo' = all local (no backend needed).
  APP_MODE: 'live',

  // ---- Backend URLs (only used when APP_MODE = 'live') ----
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
