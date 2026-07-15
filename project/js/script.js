/* ====== AUTH (Role-based) ====== */
const AUTH = {
  getUsers() { return JSON.parse(localStorage.getItem('rk_users') || '{}'); },
  saveUsers(users) { localStorage.setItem('rk_users', JSON.stringify(users)); },
  currentUser: null,

  register(username, email, password, role = 'user', doctorName = '') {
    const users = this.getUsers();
    if (users[username]) return { success: false, error: 'Username already exists' };
    users[username] = { username, email, password, role, doctorName, createdAt: new Date().toISOString() };
    this.saveUsers(users);
    return { success: true };
  },

  login(username, password) {
    const users = this.getUsers();
    if (!users[username]) return { success: false, error: 'User not found' };
    if (users[username].password !== password) return { success: false, error: 'Wrong password' };
    this.currentUser = username;
    localStorage.setItem('rk_current_user', username);
    return { success: true };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('rk_current_user');
  },

  isLoggedIn() { return !!this.currentUser; },

  isAdmin() {
    if (!this.currentUser) return false;
    const users = this.getUsers();
    return users[this.currentUser]?.role === 'admin';
  },

  isDoctor() {
    if (!this.currentUser) return false;
    const users = this.getUsers();
    return users[this.currentUser]?.role === 'doctor';
  },

  getDoctorName() {
    if (!this.currentUser) return null;
    const u = this.getUsers()[this.currentUser];
    if (u?.role === 'doctor') return u.doctorName || u.username;
    return null;
  },

  getUserRole() {
    if (!this.currentUser) return null;
    return this.getUsers()[this.currentUser]?.role || 'user';
  },

  promoteToAdmin(username) {
    if (!this.isAdmin()) return { success: false, error: 'Only admins can promote users' };
    const users = this.getUsers();
    if (!users[username]) return { success: false, error: 'User not found' };
    users[username].role = 'admin';
    this.saveUsers(users);
    return { success: true };
  },

  init() {
    const saved = localStorage.getItem('rk_current_user');
    if (saved && this.getUsers()[saved]) {
      this.currentUser = saved;
      return true;
    }
    return false;
  }
};

/* ====== STATE ====== */
function getUserKey(suffix) {
  const user = AUTH.currentUser || 'default';
  return `rk_${user}_${suffix}`;
}

function getMyAppointments() {
  let stored = localStorage.getItem('rk_appointments');
  if (!stored) {
    // Migrate from old per-user storage if it exists
    const oldKey = Object.keys(localStorage).find(k => k.startsWith('rk_') && k.endsWith('_appointments'));
    if (oldKey) stored = localStorage.getItem(oldKey);
  }
  let all = stored ? JSON.parse(stored) : [];
  // Save under global key if we migrated
  if (stored && !localStorage.getItem('rk_appointments')) {
    localStorage.setItem('rk_appointments', stored);
  }
  // Tag old entries without createdBy
  let changed = false;
  all.forEach(a => { if (!a.createdBy) { a.createdBy = 'demo'; changed = true; } });
  if (changed) localStorage.setItem('rk_appointments', JSON.stringify(all));

  if (AUTH.isDoctor()) {
    const drName = AUTH.getDoctorName();
    return all.filter(a => a.doctor === drName);
  }
  return all.filter(a => a.createdBy === AUTH.currentUser);
}

function loadState() {
  return {
    appointments: getMyAppointments(),
    medications: JSON.parse(localStorage.getItem(getUserKey('medications')) || '[]'),
    summaries: JSON.parse(localStorage.getItem(getUserKey('summaries')) || '[]'),
    currentPage: 'dashboard',
    chatMode: 'general',
    chatHistory: JSON.parse(localStorage.getItem(getUserKey('chat')) || '[]'),
    dietContext: {},
    symptomContext: {},
    isLive: typeof CONFIG !== 'undefined' && CONFIG.APP_MODE === 'live'
  };
}

let state = loadState();

/* ====== DOCTOR DATABASE (Dynamic) ====== */
const DOCTOR_SEED = [
  { name: 'Dr. S. Sharma', specialty: 'General Physician', icon: 'fa-user-md', color: 'teal', desc: 'General checkups, fever, cold, common illnesses' },
  { name: 'Dr. A. Kumar', specialty: 'General Physician', icon: 'fa-user-md', color: 'teal', desc: 'Routine consultations, preventive care' },
  { name: 'Dr. R. Verma', specialty: 'Cardiologist', icon: 'fa-heart', color: 'red', desc: 'Heart disease, chest pain, blood pressure' },
  { name: 'Dr. N. Gupta', specialty: 'Cardiologist', icon: 'fa-heart', color: 'red', desc: 'Cardiac consultations, ECG, cholesterol management' },
  { name: 'Dr. K. Singh', specialty: 'ENT Specialist', icon: 'fa-ear-deaf', color: 'blue', desc: 'Ear, nose, throat infections, hearing loss' },
  { name: 'Dr. M. Reddy', specialty: 'ENT Specialist', icon: 'fa-ear-deaf', color: 'blue', desc: 'Sinusitis, tonsillitis, ear disorders' },
  { name: 'Dr. L. Joshi', specialty: 'Dermatologist', icon: 'fa-hand', color: 'purple', desc: 'Skin rashes, allergies, acne, infections' },
  { name: 'Dr. S. Nair', specialty: 'Dermatologist', icon: 'fa-hand', color: 'purple', desc: 'Eczema, psoriasis, hair and nail disorders' },
  { name: 'Dr. V. Rao', specialty: 'Orthopedist', icon: 'fa-bone', color: 'orange', desc: 'Joint pain, fractures, back pain, arthritis' },
  { name: 'Dr. T. Das', specialty: 'Orthopedist', icon: 'fa-bone', color: 'orange', desc: 'Sports injuries, spine issues, bone health' },
  { name: 'Dr. B. Menon', specialty: 'Gastroenterologist', icon: 'fa-stomach', color: 'green', desc: 'Stomach pain, digestion, acidity, liver issues' },
  { name: 'Dr. D. Saxena', specialty: 'Gastroenterologist', icon: 'fa-stomach', color: 'green', desc: 'IBD, gastritis, colon health, nutrition' },
  { name: 'Dr. C. Iyer', specialty: 'Neurologist', icon: 'fa-brain', color: 'indigo', desc: 'Headaches, migraines, dizziness, nerve issues' },
  { name: 'Dr. H. Bose', specialty: 'Neurologist', icon: 'fa-brain', color: 'indigo', desc: 'Stroke, epilepsy, memory disorders, neuropathy' },
  { name: 'Dr. P. Devi', specialty: 'Gynecologist', icon: 'fa-venus', color: 'pink', desc: 'Women health, menstrual issues, pregnancy' },
  { name: 'Dr. A. Sharma', specialty: 'Gynecologist', icon: 'fa-venus', color: 'pink', desc: 'Fertility, menopause, routine gynecology' },
  { name: 'Dr. R. Kapoor', specialty: 'Ophthalmologist', icon: 'fa-eye', color: 'cyan', desc: 'Eye checkup, vision problems, infections' },
  { name: 'Dr. S. Malhotra', specialty: 'Ophthalmologist', icon: 'fa-eye', color: 'cyan', desc: 'Cataract, glaucoma, contact lens care' },
  { name: 'Dr. M. Desai', specialty: 'Pulmonologist', icon: 'fa-lungs', color: 'teal', desc: 'Breathing issues, asthma, cough, lung health' },
  { name: 'Dr. K. Sinha', specialty: 'Pulmonologist', icon: 'fa-lungs', color: 'teal', desc: 'TB, COPD, respiratory infections' },
  { name: 'Dr. V. Shetty', specialty: 'Dentist', icon: 'fa-tooth', color: 'blue', desc: 'Tooth pain, cavities, gum health, cleaning' },
  { name: 'Dr. N. Rao', specialty: 'Dentist', icon: 'fa-tooth', color: 'blue', desc: 'Root canal, braces, oral surgery' },
  { name: 'Dr. S. Gupta', specialty: 'Pediatrician', icon: 'fa-baby', color: 'green', desc: 'Child health, vaccinations, growth monitoring' },
  { name: 'Dr. R. Kumar', specialty: 'Pediatrician', icon: 'fa-baby', color: 'green', desc: 'Fever in children, nutrition, developmental checks' }
];

let DOCTORS = [];

function getDoctors() {
  let stored = localStorage.getItem('rk_doctors');
  if (!stored) {
    // Migrate from old per-user storage if it exists
    const oldKey = Object.keys(localStorage).find(k => k.startsWith('rk_') && k.endsWith('_doctors'));
    if (oldKey) stored = localStorage.getItem(oldKey);
  }
  if (stored) {
    DOCTORS = JSON.parse(stored);
    // Save under global key if we migrated
    if (!localStorage.getItem('rk_doctors')) {
      localStorage.setItem('rk_doctors', stored);
    }
  } else {
    // First time: seed from hardcoded list
    DOCTORS = DOCTOR_SEED.map(d => ({ ...d, id: uid() }));
    localStorage.setItem('rk_doctors', JSON.stringify(DOCTORS));
  }
  return DOCTORS;
}

function saveDoctors() {
  localStorage.setItem('rk_doctors', JSON.stringify(DOCTORS));
}

function seedDoctorsIfEmpty() {
  const stored = localStorage.getItem('rk_doctors');
  if (!stored || JSON.parse(stored).length === 0) {
    DOCTORS = DOCTOR_SEED.map(d => ({ ...d, id: uid() }));
    saveDoctors();
  }
}

/* ====== MEDICATION DATABASE (30 commonly used) ====== */
const COMMON_MEDS = [
  { name: 'Paracetamol', dosage: '500mg', use: 'Fever, body pain' },
  { name: 'Paracetamol', dosage: '650mg', use: 'Moderate fever, headache' },
  { name: 'Dolo 650', dosage: '650mg', use: 'Fever, muscle pain' },
  { name: 'Amoxicillin', dosage: '250mg', use: 'Bacterial infections' },
  { name: 'Azithromycin', dosage: '250mg', use: 'Respiratory infections' },
  { name: 'Metformin', dosage: '500mg', use: 'Diabetes control' },
  { name: 'Atorvastatin', dosage: '10mg', use: 'Cholesterol control' },
  { name: 'Losartan', dosage: '50mg', use: 'Blood pressure' },
  { name: 'Omeprazole', dosage: '20mg', use: 'Acidity, GERD' },
  { name: 'Pantoprazole', dosage: '40mg', use: 'Stomach ulcers, acidity' },
  { name: 'Aspirin', dosage: '75mg', use: 'Blood thinning, heart health' },
  { name: 'Cetirizine', dosage: '10mg', use: 'Allergies, cold' },
  { name: 'Levocetirizine', dosage: '5mg', use: 'Seasonal allergies' },
  { name: 'Ibuprofen', dosage: '400mg', use: 'Pain, inflammation' },
  { name: 'Diclofenac', dosage: '50mg', use: 'Joint pain, arthritis' },
  { name: 'Amlodipine', dosage: '5mg', use: 'Blood pressure' },
  { name: 'Metoprolol', dosage: '25mg', use: 'Heart rate, BP' },
  { name: 'Montelukast', dosage: '10mg', use: 'Asthma, allergies' },
  { name: 'Calcium + Vitamin D3', dosage: '500mg + 400IU', use: 'Bone health' },
  { name: 'Multivitamin', dosage: '1 tablet', use: 'General wellness' },
  { name: 'Vitamin B12', dosage: '500mcg', use: 'Energy, nerve health' },
  { name: 'Iron Supplement', dosage: '100mg', use: 'Anemia, weakness' },
  { name: 'Cefixime', dosage: '200mg', use: 'Bacterial infections' },
  { name: 'Doxycycline', dosage: '100mg', use: 'Skin infections, acne' },
  { name: 'Fluconazole', dosage: '150mg', use: 'Fungal infections' },
  { name: 'Ondansetron', dosage: '4mg', use: 'Nausea, vomiting' },
  { name: 'Ranitidine', dosage: '150mg', use: 'Acidity, heartburn' },
  { name: 'Clopidogrel', dosage: '75mg', use: 'Heart attack prevention' },
  { name: 'Furosemide', dosage: '40mg', use: 'Water retention, BP' },
  { name: 'Bisoprolol', dosage: '5mg', use: 'Heart failure, BP' }
];

/* ====== API LAYER ====== */
const API = {
  getBase() { return CONFIG?.API?.FLASK_URL || 'http://localhost:5000'; },
  getGasUrl() { return CONFIG?.API?.GAS_URL || ''; },

  async callGroqDirect(messages, temperature = 0.7, max_tokens = 1024) {
    const key = CONFIG?.GROQ_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages, temperature, max_tokens
        })
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.warn('Groq direct call failed:', e.message);
      return null;
    }
  },

  async call(path, method = 'POST', body = null) {
    const url = `${this.getBase()}${path}`;
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      return await res.json();
    } catch (e) {
      console.warn('API call failed (server may be offline):', path, e.message);
      return { success: false, error: e.message, offline: true };
    }
  },

  async callGas(path, method = 'GET', params = {}) {
    const gasUrl = this.getGasUrl();
    if (!gasUrl) return { success: false, error: 'GAS URL not configured' };
    params.path = path;
    const qs = '?' + new URLSearchParams({ ...params, data: JSON.stringify(params) }).toString();
    try {
      const res = await fetch(gasUrl + qs, { method, mode: 'no-cors' });
      return { success: true, data: null, note: 'no-cors response' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async generateSummary(appointment) {
    const prompt = `Generate a patient-friendly medical visit summary from this data:\n\nPatient: ${appointment.patient || 'Unknown'}\nDoctor: ${appointment.doctor || 'Unknown'}\nDate: ${appointment.date || 'Unknown'}\nTitle: ${appointment.title || 'General Visit'}\nNotes: ${appointment.notes || 'No notes'}\n\nProvide:\n1. Short visit overview\n2. Key observations\n3. Recommended next steps\n4. Follow-up advice\n\nUse plain, clear language. No alarmist wording.`;
    const groqReply = await this.callGroqDirect([{ role: 'user', content: prompt }], 0.5, 512);
    if (groqReply) return groqReply;
    const result = await this.call('/api/summarize', 'POST', { appointment });
    return result.success ? result.summary : null;
  },

  async sendSMS(to, type, details) {
    if (!state.isLive) return { success: false };
    return await this.call('/api/send-sms', 'POST', { to, type, details });
  },

  async getCalendarLink(data) {
    if (!state.isLive) return null;
    const result = await this.call('/api/calendar-link', 'POST', data);
    return result.success ? result.url : null;
  },

  async chatbot(messages, mode) {
    const groqReply = await this.callGroqDirect(messages, 0.7, 1024);
    if (groqReply) return groqReply;
    const result = await this.call('/api/chatbot', 'POST', { messages, mode });
    return result.success ? result.reply : null;
  }
};

/* ====== UTILITY ====== */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toLocaleString(); }
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function saveState() {
  // Replace all appointments belonging to this user in the global store
  let all = JSON.parse(localStorage.getItem('rk_appointments') || '[]');
  all = all.filter(a => a.createdBy !== AUTH.currentUser);
  all.push(...state.appointments);
  localStorage.setItem('rk_appointments', JSON.stringify(all));

  localStorage.setItem(getUserKey('medications'), JSON.stringify(state.medications));
  localStorage.setItem(getUserKey('summaries'), JSON.stringify(state.summaries));
  localStorage.setItem(getUserKey('chat'), JSON.stringify(state.chatHistory));
}

function getAllAppointments() {
  return JSON.parse(localStorage.getItem('rk_appointments') || '[]');
}

/* ====== TOAST ====== */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ====== DOCTOR PREVIEW ====== */
function findDoctor(name) { return DOCTORS.find(d => d.name === name); }

function renderDoctorPreview(name) {
  const doc = findDoctor(name);
  const colorMap = { teal: '#0d9488', red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', orange: '#f97316', green: '#22c55e', indigo: '#6366f1', pink: '#ec4899', cyan: '#06b6d4' };
  if (doc) {
    const c = colorMap[doc.color] || '#0d9488';
    return `<div class="doc-preview-card" style="border-left:3px solid ${c}">
      <span class="doc-preview-icon" style="background:${c}22;color:${c}"><i class="fas ${doc.icon}"></i></span>
      <div><strong>${doc.name}</strong><br><span style="font-size:0.75rem;color:var(--text-secondary)">${doc.specialty} — ${doc.desc}</span></div>
    </div>`;
  }
  // Doctor not in database (custom entry)
  return `<div class="doc-preview-card" style="border-left:3px solid var(--teal)">
    <span class="doc-preview-icon" style="background:rgba(13,148,136,0.1);color:var(--teal)"><i class="fas fa-user-md"></i></span>
    <div><strong>${name}</strong><br><span style="font-size:0.75rem;color:var(--text-secondary)">External / Custom doctor</span></div>
  </div>`;
}

function toggleDoctorInput() {
  const sel = document.getElementById('f_doctor');
  const other = document.getElementById('f_doctor_other');
  const preview = document.getElementById('doctorPreview');
  if (sel.value === '__other__') {
    other.style.display = 'block';
    other.required = true;
    other.focus();
    preview.innerHTML = '<div class="doc-preview-card" style="border-left:3px solid var(--teal)"><span class="doc-preview-icon" style="background:rgba(13,148,136,0.1);color:var(--teal)"><i class="fas fa-user-md"></i></span><div><strong>Custom doctor</strong><br><span style="font-size:0.75rem;color:var(--text-secondary)">Type the doctor name above</span></div></div>';
    preview.classList.add('visible');
  } else {
    other.style.display = 'none';
    other.required = false;
    updateDoctorPreview();
  }
}

function updateDoctorPreview() {
  const sel = document.getElementById('f_doctor');
  const preview = document.getElementById('doctorPreview');
  const name = sel.value;
  if (name && name !== '__other__') {
    preview.innerHTML = renderDoctorPreview(name);
    preview.classList.add('visible');
  } else if (name !== '__other__') {
    preview.innerHTML = '';
    preview.classList.remove('visible');
  }
}

/* ====== MEDICATION SUGGESTIONS ====== */
function selectMedicine(name, dosage) {
  document.getElementById('f_med_name').value = name;
  const dosageField = document.getElementById('f_dosage');
  if (!dosageField.value) dosageField.value = dosage;
  document.getElementById('medSuggestions').innerHTML = '';
}

function filterMedSuggestions() {
  const q = (document.getElementById('f_med_name').value || '').toLowerCase();
  const list = document.getElementById('medSuggestions');
  if (!q || q.length < 1) {
    list.innerHTML = COMMON_MEDS.map(m =>
      `<li onclick="selectMedicine('${m.name}', '${m.dosage}')" class="med-suggestion-item">
        <span class="med-suggestion-name">${m.name}</span>
        <span class="med-suggestion-meta">${m.dosage} — ${m.use}</span>
      </li>`
    ).join('');
    return;
  }
  const filtered = COMMON_MEDS.filter(m =>
    m.name.toLowerCase().includes(q) || m.use.toLowerCase().includes(q)
  );
  if (filtered.length === 0) {
    list.innerHTML = `<li class="med-suggestion-item" style="opacity:0.5;cursor:default">No matches — type your own</li>`;
    return;
  }
  list.innerHTML = filtered.map(m =>
    `<li onclick="selectMedicine('${m.name}', '${m.dosage}')" class="med-suggestion-item">
      <span class="med-suggestion-name">${m.name}</span>
      <span class="med-suggestion-meta">${m.dosage} — ${m.use}</span>
    </li>`
  ).join('');
}

/* ====== MODAL ====== */
function openModal(type, data = null) {
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  overlay.classList.add('active');

  if (type === 'appointment') {
    title.textContent = data ? 'Edit Appointment' : 'Add Appointment';

    // Load latest doctors
    getDoctors();
    const doctorList = DOCTORS;
    const specialties = [...new Set(doctorList.map(d => d.specialty))];
    let doctorOptions = '<option value="">— Select a doctor —</option>';
    if (doctorList.length > 0) {
      specialties.forEach(spec => {
        const specDoctors = doctorList.filter(d => d.specialty === spec);
        doctorOptions += `<optgroup label="${spec}">`;
        specDoctors.forEach(d => {
          const sel = data && data.doctor === d.name ? 'selected' : '';
          doctorOptions += `<option value="${d.name}" data-icon="${d.icon}" data-spec="${spec}" ${sel}>${d.name} — ${spec}</option>`;
        });
        doctorOptions += '</optgroup>';
      });
    }
    doctorOptions += `<option value="__other__">Other (type manually)</option>`;

    body.innerHTML = `
      <div class="form-group"><label>Patient Name</label><input type="text" id="f_patient" value="${data ? data.patient : ''}" placeholder="e.g. John Doe" required></div>
      <div class="form-group"><label>Doctor</label>
        <div class="doctor-select-wrapper">
          <select id="f_doctor" class="doctor-select" required onchange="toggleDoctorInput()">${doctorOptions}</select>
          <input type="text" id="f_doctor_other" placeholder="Type doctor name..." style="display:none;margin-top:0.4rem">
          <div id="doctorPreview" class="doctor-preview ${data ? 'visible' : ''}">
            ${data ? renderDoctorPreview(data.doctor) : ''}
          </div>
        </div>
      </div>
      <div class="form-group"><label>Date</label><input type="date" id="f_date" value="${data ? data.date : ''}" required></div>
      <div class="form-group"><label>Time</label><input type="time" id="f_time" value="${data ? data.time : ''}" required></div>
      <div class="form-group"><label>Title</label><input type="text" id="f_title" value="${data ? data.title : ''}" placeholder="e.g. Annual checkup"></div>
      <div class="form-group"><label>Notes</label><textarea id="f_notes" placeholder="Optional notes...">${data ? data.notes : ''}</textarea></div>
      <div class="modal-actions">
        <button class="btn-primary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn-primary btn-sm" onclick="saveAppointment('${data ? data.id : ''}')">${data ? 'Update' : 'Save'}</button>
      </div>`;
    body._type = 'appointment';
    body._editId = data ? data.id : null;
  } else if (type === 'medication') {
    title.textContent = data ? 'Edit Medication' : 'Add Medication';

    const medListStr = COMMON_MEDS.map(m =>
      `<li onclick="selectMedicine('${m.name}', '${m.dosage}')" class="med-suggestion-item">
        <span class="med-suggestion-name">${m.name}</span>
        <span class="med-suggestion-meta">${m.dosage} — ${m.use}</span>
      </li>`
    ).join('');

    body.innerHTML = `
      <div class="form-group">
        <label>Medicine Name</label>
        <div class="med-search-wrapper">
          <input type="text" id="f_med_name" value="${data ? data.name : ''}" placeholder="Type to search..." required oninput="filterMedSuggestions()" autocomplete="off">
          <ul id="medSuggestions" class="med-suggestions">${medListStr}</ul>
        </div>
      </div>
      <div class="form-group"><label>Dosage</label><input type="text" id="f_dosage" value="${data ? data.dosage : ''}" placeholder="e.g. 500mg, 1 tablet"></div>
      <div class="form-group"><label>Timing</label><select id="f_timing">
        <option value="morning" ${data && data.timing === 'morning' ? 'selected' : ''}>Morning (after breakfast)</option>
        <option value="afternoon" ${data && data.timing === 'afternoon' ? 'selected' : ''}>Afternoon (after lunch)</option>
        <option value="evening" ${data && data.timing === 'evening' ? 'selected' : ''}>Evening (after dinner)</option>
        <option value="night" ${data && data.timing === 'night' ? 'selected' : ''}>Night (before bed)</option>
        <option value="as-needed" ${data && data.timing === 'as-needed' ? 'selected' : ''}>As Needed</option>
      </select></div>
      <div class="form-group"><label>Phone (for SMS reminder)</label><input type="tel" id="f_phone" value="${data ? data.phone : ''}" placeholder="+1234567890"></div>
      <div class="form-group"><label>Start Date</label><input type="date" id="f_start" value="${data ? data.startDate : ''}"></div>
      <div class="form-group"><label>End Date</label><input type="date" id="f_end" value="${data ? data.endDate : ''}"></div>
      <div class="modal-actions">
        <button class="btn-primary btn-sm" onclick="closeModal()">Cancel</button>
        <button class="btn-primary btn-sm" onclick="saveMedication('${data ? data.id : ''}')">${data ? 'Update' : 'Save'}</button>
      </div>`;
    body._type = 'medication';
    body._editId = data ? data.id : null;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

/* ====== SAVE APPOINTMENT ====== */
async function saveAppointment(id) {
  let drName = document.getElementById('f_doctor').value.trim();
  if (drName === '__other__') {
    drName = document.getElementById('f_doctor_other').value.trim();
  }
  const data = {
    patient: document.getElementById('f_patient').value.trim(),
    doctor: drName,
    date: document.getElementById('f_date').value,
    time: document.getElementById('f_time').value,
    title: document.getElementById('f_title').value.trim(),
    notes: document.getElementById('f_notes').value.trim()
  };
  if (!data.patient || !data.doctor || !data.date || !data.time) {
    showToast('Please fill all required fields', 'error'); return;
  }
  if (id) {
    const idx = state.appointments.findIndex(a => a.id === id);
    if (idx > -1) { state.appointments[idx] = { ...state.appointments[idx], ...data }; }
    showToast('Appointment updated!');
  } else {
    data.id = uid();
    data.createdAt = now();
    data.createdBy = AUTH.currentUser || 'unknown';
    data.calendarUrl = '';
    state.appointments.push(data);

    // Generate AI summary (async; uses Groq in live mode, template in demo)
    const summaryText = await generateAISummary(data);
    state.summaries.push({
      id: uid(), appointmentId: data.id,
      date: data.date, title: data.title || 'Visit',
      doctor: data.doctor, summary: summaryText,
      createdAt: now()
    });

    // Generate Google Calendar link (client-side, works in both modes)
    if (CONFIG.FEATURES.ENABLE_CALENDAR) {
      data.calendarUrl = generateCalendarUrl(data);
      const idx = state.appointments.findIndex(a => a.id === data.id);
      if (idx > -1) state.appointments[idx].calendarUrl = data.calendarUrl;
    }

    showToast('Appointment added successfully! ' + (data.calendarUrl ? '📅 Calendar link available.' : ''));
  }
  saveState(); closeModal(); renderAll();
}

/* ====== SAVE MEDICATION ====== */
async function saveMedication(id) {
  const data = {
    name: document.getElementById('f_med_name').value.trim(),
    dosage: document.getElementById('f_dosage').value.trim(),
    timing: document.getElementById('f_timing').value,
    phone: document.getElementById('f_phone').value.trim(),
    startDate: document.getElementById('f_start').value,
    endDate: document.getElementById('f_end').value
  };
  if (!data.name) { showToast('Medicine name is required', 'error'); return; }
  if (id) {
    const idx = state.medications.findIndex(m => m.id === id);
    if (idx > -1) { state.medications[idx] = { ...state.medications[idx], ...data }; }
    showToast('Medication updated!');
  } else {
    data.id = uid();
    data.createdAt = now();
    data.status = 'active';
    state.medications.push(data);

    // Trigger SMS reminder in live mode with valid phone
    if (state.isLive && data.phone && CONFIG.FEATURES.ENABLE_SMS) {
      const smsResult = await API.sendSMS(data.phone, 'medication', data);
      if (smsResult.success) {
        showToast('Medication added! SMS reminder sent.');
      } else {
        showToast('Medication added! (SMS reminder unavailable)');
      }
      return;
    }

    showToast('Medication added!');
  }
  saveState(); closeModal(); renderAll();
}

/* ====== DELETE ====== */
function deleteAppointment(id) {
  if (!confirm('Delete this appointment?')) return;
  state.appointments = state.appointments.filter(a => a.id !== id);
  saveState(); renderAll(); showToast('Appointment deleted', 'info');
}
function deleteMedication(id) {
  if (!confirm('Delete this medication?')) return;
  state.medications = state.medications.filter(m => m.id !== id);
  saveState(); renderAll(); showToast('Medication deleted', 'info');
}
function toggleMedStatus(id) {
  const m = state.medications.find(x => x.id === id);
  if (m) { m.status = m.status === 'active' ? 'completed' : 'active'; saveState(); renderAll(); }
}

/* ====== CALENDAR LINK GENERATOR (Client-side) ====== */
function generateCalendarUrl(data) {
  const title = encodeURIComponent('Appointment with Dr. ' + (data.doctor || 'Doctor'));
  const details = encodeURIComponent('Patient: ' + (data.patient || '') + '\nTitle: ' + (data.title || '') + '\nNotes: ' + (data.notes || ''));
  const location = encodeURIComponent('RK Health Center');

  let startDate, endDate;
  if (data.date && data.time) {
    const [h, m] = data.time.split(':');
    const start = new Date(data.date + 'T' + data.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    startDate = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    endDate = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } else {
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    startDate = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    endDate = later.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
}

/* ====== AI SUMMARY GENERATOR ====== */
async function generateAISummary(appt) {
  // Try Groq API in live mode
  if (state.isLive) {
    try {
      const aiSummary = await API.generateSummary(appt);
      if (aiSummary) return aiSummary;
    } catch (e) { /* fallback */ }
  }
  // Demo fallback templates
  const templates = [
    `Visit Summary: ${appt.patient} visited Dr. ${appt.doctor} on ${formatDate(appt.date)} for "${appt.title || 'consultation'}". ${appt.notes ? 'Notes: ' + appt.notes : 'Routine checkup conducted.'} Recommended to follow prescribed care plan and schedule follow-up as needed.`,
    `Care Note: Patient ${appt.patient} saw Dr. ${appt.doctor}. Visit type: ${appt.title || 'General consultation'}. ${appt.notes ? 'Observations: ' + appt.notes : 'No specific observations recorded.'} Continue monitoring symptoms and maintain medication schedule.`,
    `Health Summary: Dr. ${appt.doctor} attended to ${appt.patient}. Purpose: ${appt.title || 'Medical visit'}. ${appt.notes ? 'Details: ' + appt.notes : 'Standard consultation completed.'} Patient advised to rest and follow up if symptoms persist.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/* ====== NAVIGATION ====== */
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
  if (link) link.classList.add('active');
  const titles = { dashboard: 'Dashboard', appointments: 'Appointments', medications: 'Medications', chatbot: 'AI Assistant', reports: 'Reports', doctors: 'Manage Doctors' };
  document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
  if (page === 'dashboard') renderDashboard();
  else if (page === 'appointments') renderAppointments();
  else if (page === 'medications') renderMedications();
  else if (page === 'reports') renderReports();
  else if (page === 'doctors') renderDoctors();
  if (window.innerWidth <= 768) closeSidebar();
}

document.querySelectorAll('.sidebar-nav a').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.page); });
});

/* ====== SIDEBAR TOGGLE ====== */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}
document.getElementById('menuToggle').addEventListener('click', toggleSidebar);

/* ====== AUTH UI ====== */
let loginMode = 'patient';

function setLoginMode(mode) {
  loginMode = mode;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const title = document.getElementById('loginTitle');
  const sub = document.getElementById('loginSub');
  const btnText = document.getElementById('loginBtnText');
  const patientToggle = document.getElementById('patientAuthToggle');
  const doctorHint = document.getElementById('doctorAuthHint');
  if (mode === 'doctor') {
    title.textContent = 'Doctor Portal';
    sub.textContent = 'Sign in to manage your appointments and patients';
    btnText.textContent = 'Sign In as Doctor';
    patientToggle.style.display = 'none';
    doctorHint.style.display = 'block';
    doctorHint.innerHTML = '<i class="fas fa-info-circle"></i> Demo doctors: <strong>drsharma</strong> / <strong>doc123</strong> (Dr. S. Sharma) | <strong>drverma</strong> / <strong>doc123</strong> (Dr. R. Verma)';
    document.getElementById('registerFormContainer').style.display = 'none';
    document.getElementById('loginFormContainer').style.display = 'block';
  } else {
    title.textContent = 'Welcome Back';
    sub.textContent = 'Sign in to manage your health journey';
    btnText.textContent = 'Sign In';
    patientToggle.style.display = 'block';
    doctorHint.style.display = 'none';
  }
}

function showRegister() {
  document.getElementById('loginFormContainer').style.display = 'none';
  document.getElementById('registerFormContainer').style.display = 'block';
}
function showLogin() {
  document.getElementById('loginFormContainer').style.display = 'block';
  document.getElementById('registerFormContainer').style.display = 'none';
}

/* ====== LOGIN/LOGOUT ====== */
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!user || !pass) { showToast('Please fill all fields', 'error'); return; }
  const users = AUTH.getUsers();
  const userInfo = users[user];
  if (!userInfo) { showToast('User not found', 'error'); return; }
  if (userInfo.password !== pass) { showToast('Wrong password', 'error'); return; }
  // Validate role matches the selected login tab
  if (loginMode === 'doctor' && userInfo.role !== 'doctor') {
    showToast('This account is not a doctor. Use the Patient tab.', 'error'); return;
  }
  if (loginMode === 'patient' && userInfo.role === 'doctor') {
    showToast('Doctor accounts must use the Doctor Portal tab.', 'error'); return;
  }
  AUTH.currentUser = user;
  localStorage.setItem('rk_current_user', user);
  state = loadState();
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appContainer').classList.add('active');
  initApp();
});

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('regUser').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const confirm = document.getElementById('regPassConfirm').value;
  if (!user || !pass) { showToast('Username and password are required', 'error'); return; }
  if (pass.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
  if (pass !== confirm) { showToast('Passwords do not match', 'error'); return; }
  const result = AUTH.register(user, email, pass);
  if (!result.success) { showToast(result.error, 'error'); return; }
  showToast('Account created! Sign in now.', 'success');
  document.getElementById('regUser').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regPass').value = '';
  document.getElementById('regPassConfirm').value = '';
  showLogin();
});

document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  AUTH.logout();
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('appContainer').classList.remove('active');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
});

// Seed default accounts
(function seedAccounts() {
  const users = AUTH.getUsers();
  if (!users['admin']) {
    users['admin'] = { username: 'admin', email: 'admin@rkhealth.com', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() };
  }
  if (!users['demo']) {
    users['demo'] = { username: 'demo', email: '', password: 'demo123', role: 'user', createdAt: new Date().toISOString() };
  }
  if (!users['drsharma']) {
    users['drsharma'] = { username: 'drsharma', email: 'dr.sharma@rkhealth.com', password: 'doc123', role: 'doctor', doctorName: 'Dr. S. Sharma', createdAt: new Date().toISOString() };
  }
  if (!users['drverma']) {
    users['drverma'] = { username: 'drverma', email: 'dr.verma@rkhealth.com', password: 'doc123', role: 'doctor', doctorName: 'Dr. R. Verma', createdAt: new Date().toISOString() };
  }
  AUTH.saveUsers(users);
})();

// Check for existing session on load
if (AUTH.init()) {
  state = loadState();
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appContainer').classList.add('active');
  setTimeout(initApp, 100);
}

/* ====== DATE DISPLAY ====== */
function updateDate() {
  const d = new Date();
  document.getElementById('dateDisplay').textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ====== RENDER ALL ====== */
function renderAll() {
  updateDate();
  if (state.currentPage === 'dashboard') renderDashboard();
  if (state.currentPage === 'appointments') renderAppointments();
  if (state.currentPage === 'medications') renderMedications();
  if (state.currentPage === 'reports') renderReports();
}

/* ====== RENDER DASHBOARD ====== */
function renderDashboard() {
  if (AUTH.isDoctor()) { renderDoctorDashboard(); return; }
  const today = new Date().toISOString().split('T')[0];
  const apptsToday = state.appointments.filter(a => a.date === today).length;
  const medsActive = state.medications.filter(m => m.status === 'active').length;
  const reportCount = state.summaries.length;

  document.getElementById('apptCount').textContent = apptsToday;
  document.getElementById('medCount').textContent = medsActive;
  document.getElementById('reportCount').textContent = state.appointments.length;
  document.getElementById('summaryCount').textContent = reportCount;

  const timeline = document.getElementById('timelineList');
  const all = [...state.appointments.map(a => ({ ...a, _type: 'appointment' })), ...state.medications.map(m => ({ ...m, _type: 'medication' })), ...state.summaries.map(s => ({ ...s, _type: 'summary' }))];
  all.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  const recent = all.slice(0, 5);
  if (recent.length === 0) { timeline.innerHTML = '<p class="empty-state">No recent activity</p>'; }
  else {
    timeline.innerHTML = recent.map(item => {
      if (item._type === 'appointment') {
        return `<div class="timeline-item"><div class="timeline-icon blue"><i class="fas fa-calendar-check"></i></div><div class="timeline-text"><h4>Appointment with Dr. ${item.doctor}</h4><p>${formatDate(item.date)} at ${formatTime(item.time)}</p></div></div>`;
      } else if (item._type === 'medication') {
        return `<div class="timeline-item"><div class="timeline-icon green"><i class="fas fa-pills"></i></div><div class="timeline-text"><h4>${item.name} - ${item.dosage}</h4><p>${item.timing} | ${item.status}</p></div></div>`;
      } else {
        return `<div class="timeline-item"><div class="timeline-icon teal"><i class="fas fa-robot"></i></div><div class="timeline-text"><h4>AI Summary: ${item.title}</h4><p>${item.date} - Dr. ${item.doctor}</p></div></div>`;
      }
    }).join('');
  }

  const upcoming = document.getElementById('upcomingList');
  const upcomingAppts = state.appointments.filter(a => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5);
  if (upcomingAppts.length === 0) { upcoming.innerHTML = '<p class="empty-state">No upcoming appointments</p>'; }
  else {
    upcoming.innerHTML = upcomingAppts.map(a =>
      `<div class="timeline-item"><div class="timeline-icon teal"><i class="fas fa-user-md"></i></div><div class="timeline-text"><h4>Dr. ${a.doctor}</h4><p>${formatDate(a.date)} at ${formatTime(a.time)} - ${a.patient}</p></div></div>`
    ).join('');
  }
}

/* ====== DOCTOR DASHBOARD ====== */
function renderDoctorDashboard() {
  const doctorName = AUTH.getDoctorName();
  const today = new Date().toISOString().split('T')[0];

  // Filter appointments for this doctor
  const myAppts = state.appointments.filter(a => a.doctor === doctorName);
  const todayAppts = myAppts.filter(a => a.date === today);
  const upcomingAppts = myAppts.filter(a => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const pastAppts = myAppts.filter(a => a.date < today);
  const uniquePatients = [...new Set(myAppts.map(a => a.patient))];

  // Update summary cards for doctor context
  document.getElementById('apptCount').textContent = todayAppts.length;
  document.getElementById('medCount').textContent = uniquePatients.length;
  document.getElementById('reportCount').textContent = myAppts.length;
  document.getElementById('summaryCount').textContent = pastAppts.length;

  // Override quick actions for doctor
  document.querySelector('.quick-actions').innerHTML = `
    <button class="qa-btn" style="border-color:var(--teal);color:var(--teal)" onclick="navigateTo('appointments')"><i class="fas fa-calendar-check"></i> My Appointments (${myAppts.length})</button>
    <button class="qa-btn" onclick="navigateTo('chatbot')"><i class="fas fa-robot"></i> AI Assistant</button>
  `;

  // Timeline shows today's schedule
  const timeline = document.getElementById('timelineList');
  if (todayAppts.length === 0) {
    timeline.innerHTML = '<p class="empty-state">No appointments scheduled for today ✅</p>';
  } else {
    timeline.innerHTML = todayAppts.map(a =>
      `<div class="timeline-item">
        <div class="timeline-icon teal"><i class="fas fa-user"></i></div>
        <div class="timeline-text">
          <h4>${a.patient} ${a.title ? '— ' + a.title : ''}</h4>
          <p>${formatTime(a.time)} ${a.notes ? '· ' + a.notes : ''}</p>
        </div>
      </div>`
    ).join('');
  }

  // Upcoming shows all upcoming for this doctor
  const upcoming = document.getElementById('upcomingList');
  if (upcomingAppts.length === 0) {
    upcoming.innerHTML = '<p class="empty-state">No upcoming appointments</p>';
  } else {
    upcoming.innerHTML = upcomingAppts.map(a =>
      `<div class="timeline-item">
        <div class="timeline-icon blue"><i class="fas fa-calendar-day"></i></div>
        <div class="timeline-text">
          <h4>${a.patient}</h4>
          <p>${formatDate(a.date)} at ${formatTime(a.time)} ${a.title ? '· ' + a.title : ''}</p>
        </div>
      </div>`
    ).join('');
  }

  // Update page title
  document.getElementById('pageTitle').textContent = 'Doctor Dashboard';
}

/* ====== RENDER APPOINTMENTS ====== */
function renderAppointments() {
  const container = document.getElementById('appointmentList');
  const search = (document.getElementById('apptSearch').value || '').toLowerCase();
  const filter = document.getElementById('apptFilter').value;
  const today = new Date().toISOString().split('T')[0];

  let list = state.appointments;
  // If doctor is logged in, only show their appointments
  if (AUTH.isDoctor()) {
    const drName = AUTH.getDoctorName();
    list = list.filter(a => a.doctor === drName);
    // Hide add button for doctors
    const addBtn = document.querySelector('#page-appointments .section-header .btn-primary');
    if (addBtn) addBtn.style.display = 'none';
  } else {
    const addBtn = document.querySelector('#page-appointments .section-header .btn-primary');
    if (addBtn) addBtn.style.display = 'inline-flex';
  }
  if (filter === 'upcoming') list = list.filter(a => a.date >= today);
  else if (filter === 'past') list = list.filter(a => a.date < today);
  if (search) list = list.filter(a => a.patient.toLowerCase().includes(search) || a.doctor.toLowerCase().includes(search) || (a.title && a.title.toLowerCase().includes(search)));

  list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (list.length === 0) { container.innerHTML = '<p class="empty-state">No appointments found</p>'; return; }

  container.innerHTML = list.map(a => {
    const isUpcoming = a.date >= today;
    const doc = findDoctor(a.doctor);
    const docIcon = doc ? doc.icon : 'fa-user-md';
    const docColor = doc ? doc.color : 'teal';
    const docSpec = doc ? doc.specialty : '';
    const calBtn = a.calendarUrl ? `<button onclick="window.open('${a.calendarUrl}','_blank')" class="edit-btn" title="Add to Calendar"><i class="fas fa-calendar-plus"></i></button>` : '';
    return `<div class="record-card">
      <div class="record-icon ${docColor}"><i class="fas ${docIcon}"></i></div>
      <div class="record-info">
        <h4>${a.patient} — Dr. ${a.doctor}</h4>
        <p>${formatDate(a.date)} at ${formatTime(a.time)} ${a.title ? '· ' + a.title : ''} ${docSpec ? '· <span style="color:var(--teal)">' + docSpec + '</span>' : ''}</p>
        <span class="badge ${isUpcoming ? 'upcoming' : 'past'}">${isUpcoming ? 'Upcoming' : 'Past'}</span>
        ${a.notes ? `<p style="font-size:0.75rem;color:var(--text-light);margin-top:0.2rem">${a.notes}</p>` : ''}
      </div>
      <div class="record-actions">
        ${calBtn}
        <button class="edit-btn" onclick="openModal('appointment', state.appointments.find(x => x.id === '${a.id}'))" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" onclick="deleteAppointment('${a.id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ====== RENDER MEDICATIONS ====== */
function renderMedications() {
  const container = document.getElementById('medicationList');
  const search = (document.getElementById('medSearch').value || '').toLowerCase();
  const filter = document.getElementById('medFilter').value;

  let list = state.medications;
  if (filter === 'active') list = list.filter(m => m.status === 'active');
  else if (filter === 'completed') list = list.filter(m => m.status === 'completed');
  if (search) list = list.filter(m => m.name.toLowerCase().includes(search));

  if (list.length === 0) { container.innerHTML = '<p class="empty-state">No medications found</p>'; return; }

  container.innerHTML = list.map(m => {
    const isActive = m.status === 'active';
    return `<div class="record-card">
      <div class="record-icon ${isActive ? 'green' : 'orange'}"><i class="fas fa-pills"></i></div>
      <div class="record-info">
        <h4>${m.name} ${m.dosage ? '— ' + m.dosage : ''}</h4>
        <p>${m.timing} ${m.startDate ? '· Started ' + formatDate(m.startDate) : ''} ${m.phone ? '· SMS: ' + m.phone : ''}</p>
        <span class="badge ${isActive ? 'active' : 'completed'}">${isActive ? 'Active' : 'Completed'}</span>
      </div>
      <div class="record-actions">
        <button onclick="toggleMedStatus('${m.id}')" title="Toggle status"><i class="fas ${isActive ? 'fa-check-circle' : 'fa-undo'}"></i></button>
        <button class="edit-btn" onclick="openModal('medication', state.medications.find(x => x.id === '${m.id}'))" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" onclick="deleteMedication('${m.id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ====== DOCTOR MANAGEMENT ====== */
const DOCTOR_ICONS = ['fa-user-md', 'fa-heart', 'fa-ear-deaf', 'fa-hand', 'fa-bone', 'fa-stomach', 'fa-brain', 'fa-venus', 'fa-eye', 'fa-lungs', 'fa-tooth', 'fa-baby', 'fa-solid fa-user-nurse', 'fa-solid fa-syringe'];
const DOCTOR_COLORS = ['teal', 'blue', 'green', 'red', 'purple', 'orange', 'indigo', 'pink', 'cyan'];
const DOCTOR_SPECIALTIES = ['General Physician', 'Cardiologist', 'ENT Specialist', 'Dermatologist', 'Orthopedist', 'Gastroenterologist', 'Neurologist', 'Gynecologist', 'Ophthalmologist', 'Pulmonologist', 'Dentist', 'Pediatrician', 'Psychiatrist', 'Endocrinologist', 'Nephrologist', 'Oncologist', 'Urologist', 'Rheumatologist'];

function populateSpecFilter() {
  const sel = document.getElementById('doctorSpecFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="all">All Specialties</option>';
  DOCTOR_SPECIALTIES.forEach(s => {
    sel.innerHTML += `<option value="${s}">${s}</option>`;
  });
  // Also add any specialties already in use
  DOCTORS.forEach(d => {
    if (![...sel.options].some(o => o.value === d.specialty)) {
      sel.innerHTML += `<option value="${d.specialty}">${d.specialty}</option>`;
    }
  });
}

function renderDoctors() {
  getDoctors();
  const container = document.getElementById('doctorList');
  const search = (document.getElementById('doctorSearch').value || '').toLowerCase();
  const specFilter = document.getElementById('doctorSpecFilter')?.value || 'all';
  const isAdmin = AUTH.isAdmin();

  document.getElementById('totalDocCount').textContent = DOCTORS.length;
  document.getElementById('specCount').textContent = [...new Set(DOCTORS.map(d => d.specialty))].length;

  // Show/hide admin-only controls
  document.querySelectorAll('.admin-only').forEach(el => { el.style.display = isAdmin ? '' : 'none'; });
  const addBtn = document.querySelector('#page-doctors .section-header .btn-primary');
  if (addBtn) addBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  const statsRow = document.getElementById('doctorStats');
  if (statsRow) statsRow.style.display = 'flex';

  let list = DOCTORS;
  if (specFilter !== 'all') list = list.filter(d => d.specialty === specFilter);
  if (search) list = list.filter(d => d.name.toLowerCase().includes(search) || d.specialty.toLowerCase().includes(search) || d.desc.toLowerCase().includes(search));

  if (list.length === 0) {
    container.innerHTML = isAdmin
      ? '<p class="empty-state">No doctors found. Click "Add Doctor" to add one.</p>'
      : '<p class="empty-state">No doctors in the system yet.</p>';
    return;
  }

  container.innerHTML = list.map(d => {
    const colorMap = { teal: '#0d9488', red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', orange: '#f97316', green: '#22c55e', indigo: '#6366f1', pink: '#ec4899', cyan: '#06b6d4' };
    const c = colorMap[d.color] || '#0d9488';
    return `<div class="record-card">
      <div class="record-icon ${d.color}"><i class="fas ${d.icon}"></i></div>
      <div class="record-info">
        <h4>${d.name}</h4>
        <p><span style="color:${c};font-weight:500">${d.specialty}</span> — ${d.desc}</p>
      </div>
      <div class="record-actions">
        ${isAdmin ? `<button class="delete-btn" onclick="deleteDoctor('${d.id}')" title="Remove doctor"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function openDoctorModal(data = null) {
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  overlay.classList.add('active');

  title.textContent = data ? 'Edit Doctor' : 'Add New Doctor';

  const iconOptions = DOCTOR_ICONS.map(i => `<option value="${i}" ${data && data.icon === i ? 'selected' : ''}>${i.replace('fa-', '')}</option>`).join('');
  const colorOptions = DOCTOR_COLORS.map(c => `<option value="${c}" ${data && data.color === c ? 'selected' : ''}>${c}</option>`).join('');
  const specOptions = DOCTOR_SPECIALTIES.map(s => `<option value="${s}" ${data && data.specialty === s ? 'selected' : ''}>${s}</option>`).join('');

  body.innerHTML = `
    <div class="form-group"><label>Doctor Name</label><input type="text" id="f_doc_name" value="${data ? data.name : 'Dr. '}" placeholder="e.g. Dr. John Smith" required></div>
    <div class="form-group"><label>Specialty</label><select id="f_doc_spec">${specOptions}<option value="other">Other (type below)</option></select><input type="text" id="f_doc_spec_other" placeholder="Custom specialty..." style="display:none;margin-top:0.4rem" oninput="document.getElementById('f_doc_spec').value='other'"></div>
    <div class="form-group"><label>Description</label><textarea id="f_doc_desc" placeholder="e.g. Heart disease, chest pain, blood pressure">${data ? data.desc : ''}</textarea></div>
    <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div><label>Icon</label><select id="f_doc_icon">${iconOptions}</select></div>
      <div><label>Color</label><select id="f_doc_color">${colorOptions}</select></div>
    </div>
    <div class="modal-actions">
      <button class="btn-primary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn-primary btn-sm" onclick="saveDoctor('${data ? data.id : ''}')">${data ? 'Update' : 'Add Doctor'}</button>
    </div>`;

  body._editId = data ? data.id : null;

  // Toggle custom specialty field
  setTimeout(() => {
    const specSel = document.getElementById('f_doc_spec');
    const specOther = document.getElementById('f_doc_spec_other');
    if (specSel) {
      specSel.addEventListener('change', () => {
        specOther.style.display = specSel.value === 'other' ? 'block' : 'none';
      });
    }
  }, 50);
}

function saveDoctor(id) {
  const name = document.getElementById('f_doc_name').value.trim();
  let specialty = document.getElementById('f_doc_spec').value;
  if (specialty === 'other') specialty = document.getElementById('f_doc_spec_other').value.trim();
  const desc = document.getElementById('f_doc_desc').value.trim();
  const icon = document.getElementById('f_doc_icon').value;
  const color = document.getElementById('f_doc_color').value;

  if (!name || !specialty) { showToast('Name and specialty are required', 'error'); return; }

  getDoctors();

  if (id) {
    const idx = DOCTORS.findIndex(d => d.id === id);
    if (idx > -1) { DOCTORS[idx] = { ...DOCTORS[idx], name, specialty, desc, icon, color }; }
    showToast('Doctor updated!');
  } else {
    if (DOCTORS.some(d => d.name === name)) { showToast('Doctor already exists', 'error'); return; }
    DOCTORS.push({ id: uid(), name, specialty, desc, icon, color });
    showToast('Doctor added successfully!');
  }

  saveDoctors();
  populateSpecFilter();
  closeModal();
  renderDoctors();
}

function deleteDoctor(id) {
  if (!confirm('Remove this doctor from the hospital?')) return;
  getDoctors();
  DOCTORS = DOCTORS.filter(d => d.id !== id);
  saveDoctors();
  renderDoctors();
  showToast('Doctor removed', 'info');
}

// Add dynamic specialty to select when "other" is chosen
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'f_doc_spec' && e.target.value === 'other') {
    document.getElementById('f_doc_spec_other').style.display = 'block';
  }
});

/* ====== USER MANAGEMENT (Admin only) ====== */
function openUserManager() {
  if (!AUTH.isAdmin()) return;
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  overlay.classList.add('active');
  title.textContent = 'User Management (Admin)';

  getDoctors();
  const users = AUTH.getUsers();
  const currentUser = AUTH.currentUser;
  let rows = '';
  Object.entries(users).forEach(([uname, info]) => {
    const isCurrent = uname === currentUser;
    let roleBadge = '';
    if (info.role === 'admin') roleBadge = '<span style="color:var(--teal);font-weight:600">👑 Admin</span>';
    else if (info.role === 'doctor') roleBadge = '<span style="color:var(--blue);font-weight:600">🩺 ' + (info.doctorName || 'Doctor') + '</span>';
    else roleBadge = '<span style="color:var(--text-secondary)">User</span>';

    let actionBtn = '';
    if (info.role === 'user' && !isCurrent) {
      actionBtn = `<button class="btn-sm btn-primary" style="padding:0.3rem 0.6rem;font-size:0.75rem" onclick="promoteUser('${uname}')">Promote</button>`;
    }
    const icon = info.role === 'admin' ? 'fa-shield-halved' : info.role === 'doctor' ? 'fa-user-md' : 'fa-user';
    const iconColor = info.role === 'admin' ? 'var(--teal)' : info.role === 'doctor' ? 'var(--blue)' : 'var(--teal)';
    rows += `<div class="record-card" style="padding:0.6rem 1rem">
      <div class="record-icon" style="width:36px;height:36px;font-size:0.85rem;background:rgba(13,148,136,0.1);color:${iconColor}"><i class="fas ${icon}"></i></div>
      <div class="record-info"><h4 style="font-size:0.85rem">${uname} ${isCurrent ? '<span style="color:var(--text-light);font-size:0.7rem">(you)</span>' : ''}</h4>
      <p style="font-size:0.75rem">${roleBadge} · ${info.email || 'no email'} · ${new Date(info.createdAt).toLocaleDateString()}</p></div>
      <div class="record-actions">${actionBtn}</div>
    </div>`;
  });

  // Build doctor dropdown for creating doctor accounts
  const existingDoctorUsers = Object.values(users).filter(u => u.role === 'doctor').map(u => u.doctorName);
  const availableDocs = DOCTORS.filter(d => !existingDoctorUsers.includes(d.name));
  const docOptions = availableDocs.map(d => `<option value="${d.name}">${d.name} (${d.specialty})</option>`).join('');

  body.innerHTML = `
    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem">All registered users. Promote users or create doctor accounts.</p>

    ${availableDocs.length > 0 ? `
    <div style="background:var(--bg);padding:0.75rem;border-radius:8px;margin-bottom:1rem">
      <strong style="font-size:0.85rem">🩺 Create Doctor Account</strong>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
        <select id="f_new_doc_select" style="flex:1;min-width:150px;padding:0.45rem 0.6rem;border-radius:6px;border:1px solid var(--border);font-size:0.8rem">
          <option value="">— Select doctor —</option>
          ${docOptions}
        </select>
        <input type="text" id="f_new_doc_user" placeholder="Username" style="flex:1;min-width:120px;padding:0.45rem 0.6rem;border-radius:6px;border:1px solid var(--border);font-size:0.8rem">
        <input type="password" id="f_new_doc_pass" placeholder="Password" style="flex:1;min-width:120px;padding:0.45rem 0.6rem;border-radius:6px;border:1px solid var(--border);font-size:0.8rem">
        <button class="btn-sm btn-primary" style="white-space:nowrap" onclick="createDoctorAccount()">Create</button>
      </div>
    </div>` : '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">✅ All doctors already have accounts</p>'}

    <div style="display:flex;flex-direction:column;gap:0.4rem">${rows}</div>
    <div class="modal-actions" style="margin-top:0.75rem"><button class="btn-sm btn-primary" onclick="closeModal()">Close</button></div>`;
}

function createDoctorAccount() {
  const docName = document.getElementById('f_new_doc_select').value;
  const username = document.getElementById('f_new_doc_user').value.trim();
  const password = document.getElementById('f_new_doc_pass').value;
  if (!docName || !username || !password) { showToast('Fill all fields', 'error'); return; }
  if (password.length < 4) { showToast('Password min 4 chars', 'error'); return; }
  const doc = DOCTORS.find(d => d.name === docName);
  const email = (doc ? doc.name.toLowerCase().replace(/\./g,'').replace(/\s+/g,'.') : username) + '@rkhealth.com';
  const result = AUTH.register(username, email, password, 'doctor', docName);
  if (result.success) {
    showToast(`Doctor account "${username}" created for ${docName}!`, 'success');
    openUserManager(); // Refresh
  } else {
    showToast(result.error, 'error');
  }
}

function promoteUser(username) {
  if (!AUTH.isAdmin()) return;
  if (!confirm(`Promote "${username}" to admin? They will be able to manage doctors and users.`)) return;
  const result = AUTH.promoteToAdmin(username);
  if (result.success) {
    showToast(`${username} is now an admin!`, 'success');
    openUserManager(); // Refresh the modal
  } else {
    showToast(result.error, 'error');
  }
}

/* ====== RENDER REPORTS ====== */
function renderReports() {
  document.getElementById('reportDate').textContent = 'Generated: ' + new Date().toLocaleString();

  const apptDiv = document.getElementById('reportAppointments');
  if (state.appointments.length === 0) { apptDiv.innerHTML = '<p style="color:var(--text-light)">No appointments recorded</p>'; }
  else {
    apptDiv.innerHTML = state.appointments.map(a =>
      `<div class="report-item"><span class="label">${formatDate(a.date)} at ${formatTime(a.time)}</span><span class="value">${a.patient} — Dr. ${a.doctor}${a.title ? ' (' + a.title + ')' : ''}</span></div>`
    ).join('');
  }

  const medDiv = document.getElementById('reportMedications');
  if (state.medications.length === 0) { medDiv.innerHTML = '<p style="color:var(--text-light)">No medications recorded</p>'; }
  else {
    medDiv.innerHTML = state.medications.map(m =>
      `<div class="report-item"><span class="label">${m.name} ${m.dosage}</span><span class="value">${m.timing} — ${m.status}</span></div>`
    ).join('');
  }

  const compDiv = document.getElementById('reportCompliance');
  const active = state.medications.filter(m => m.status === 'active').length;
  const completed = state.medications.filter(m => m.status === 'completed').length;
  const totalAppts = state.appointments.length;
  compDiv.innerHTML = `
    <div class="report-item"><span class="label">Active Medications</span><span class="value">${active}</span></div>
    <div class="report-item"><span class="label">Completed Medications</span><span class="value">${completed}</span></div>
    <div class="report-item"><span class="label">Total Appointments</span><span class="value">${totalAppts}</span></div>
    <div class="report-item"><span class="label">AI Summaries Generated</span><span class="value">${state.summaries.length}</span></div>
  `;

  const sumDiv = document.getElementById('reportSummaries');
  if (state.summaries.length === 0) { sumDiv.innerHTML = '<p style="color:var(--text-light)">No AI summaries generated yet</p>'; }
  else {
    sumDiv.innerHTML = state.summaries.slice(-5).reverse().map(s =>
      `<div style="padding:0.5rem 0;border-bottom:1px dashed var(--border);font-size:0.82rem"><strong>${formatDate(s.date)} — ${s.title}</strong><br>${s.summary}</div>`
    ).join('');
  }
}

/* ====== EXPORT REPORT ====== */
function exportReport() {
  window.print();
  showToast('Report ready for printing/PDF', 'info');
}

/* ====== ====== CHATBOT ====== ====== */
const CHAT_SHORTCUTS = {
  general: ['I have symptoms', 'Diet plan', 'How to add appointment?', 'Help'],
  symptom: ['Fever and cough', 'Headache', 'Stomach pain', 'Skin rash', 'Chest pain', 'Joint pain'],
  diet: ['Weight loss', 'Diabetes friendly', 'Heart healthy', 'High protein', 'Recovery meals']
};

function setChatMode(mode) {
  state.chatMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  updateChatShortcuts();
  if (mode === 'symptom') {
    addBotMessage('I can help analyze your symptoms. Tell me what you are feeling, or use the shortcuts above. Remember, I can suggest a specialist but I cannot diagnose.');
  } else if (mode === 'diet') {
    addBotMessage('Welcome to Diet Assistant! Tell me your goal (weight loss, diabetes-friendly, heart-healthy, high-protein, or recovery) and your preferences (veg/non-veg, allergies, spice level).');
  } else {
    addBotMessage('Hi! I am your RK Health assistant. Ask me about appointments, medications, symptoms, or diet plans.');
  }
}

function updateChatShortcuts() {
  const container = document.getElementById('chatShortcuts');
  const shortcuts = CHAT_SHORTCUTS[state.chatMode] || CHAT_SHORTCUTS.general;
  container.innerHTML = shortcuts.map(s => `<button class="chip-btn" onclick="document.getElementById('chatInput').value='${s.replace(/'/g, "\\'")}';sendChatMessage()">${s}</button>`).join('');
}

function clearChat() {
  state.chatHistory = [];
  saveState();
  document.getElementById('chatMessages').innerHTML = '';
  setChatMode(state.chatMode);
}

function addBotMessage(text) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.innerHTML = `${text}<span class="msg-time">${new Date().toLocaleTimeString()}</span>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  state.chatHistory.push({ role: 'bot', text, time: new Date().toISOString() });
  saveState();
}

function addUserMessage(text) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = `${text}<span class="msg-time">${new Date().toLocaleTimeString()}</span>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  state.chatHistory.push({ role: 'user', text, time: new Date().toISOString() });
  saveState();
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'chat-typing';
  el.id = 'typingIndicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addUserMessage(text);
  showTyping();

  if (state.isLive) {
    try {
      const messages = state.chatHistory.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));
      const reply = await API.chatbot(messages, state.chatMode);
      hideTyping();
      if (reply) {
        addBotMessage(reply);
        return;
      }
    } catch (e) { /* fallback to demo */ }
    hideTyping();
    const reply = generateChatReply(text);
    addBotMessage(reply);
  } else {
    setTimeout(() => {
      hideTyping();
      const reply = generateChatReply(text);
      addBotMessage(reply);
    }, 500 + Math.random() * 800);
  }
}

/* ====== CHATBOT LOGIC ====== */
function generateChatReply(text) {
  const t = text.toLowerCase().trim();

  // Mode-specific handling
  if (state.chatMode === 'symptom') {
    return handleSymptomMode(t, text);
  }
  if (state.chatMode === 'diet') {
    return handleDietMode(t, text);
  }

  // General mode: detect intent
  if (isGreeting(t)) return getGreeting();
  if (t.includes('symptom') || t.includes('feeling') || t.includes('feel') || t.includes('pain') || t.includes('hurt') || t.includes('sick') || t.includes('ache')) {
    state.chatMode = 'symptom';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'symptom'));
    updateChatShortcuts();
    return handleSymptomMode(t, text);
  }
  if (t.includes('diet') || t.includes('meal') || t.includes('food') || t.includes('eat') || t.includes('nutrition') || t.includes('weight')) {
    state.chatMode = 'diet';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'diet'));
    updateChatShortcuts();
    return handleDietMode(t, text);
  }
  if (t.includes('appointment') || t.includes('book') || t.includes('schedule') || t.includes('visit')) {
    const count = state.appointments.length;
    if (count === 0) return 'You have no appointments yet. Go to the Appointments page and click "Add Appointment" to schedule one!';
    return `You have ${count} appointment${count > 1 ? 's' : ''} recorded. The next one is on ${formatDate(state.appointments[0].date)}. You can view and manage them on the Appointments page.`;
  }
  if (t.includes('medicine') || t.includes('medication') || t.includes('pill') || t.includes('drug') || t.includes('reminder')) {
    const count = state.medications.length;
    const active = state.medications.filter(m => m.status === 'active').length;
    if (count === 0) return 'No medications tracked yet. Head to the Medications page to add your first one!';
    return `You have ${count} medication${count > 1 ? 's' : ''} recorded, ${active} currently active. You can manage them on the Medications page.`;
  }
  if (t.includes('help') || t.includes('what can you') || t.includes('capabilities') || t.includes('features')) {
    return getHelpText();
  }
  if (t.includes('report') || t.includes('export') || t.includes('print') || t.includes('summary')) {
    return 'You can view and export your health report on the Reports page. It includes your appointments, medications, compliance status, and AI-generated visit summaries.';
  }
  if (t.includes('hello') || t.includes('hi ') || t.includes('hey') || t.includes('good morning') || t.includes('good evening')) {
    return getGreeting();
  }
  if (t.includes('thank')) {
    return 'You are welcome! I am here to help with your health management. Is there anything else I can assist with?';
  }

  return getDefaultHelp();
}

/* ====== SYMPTOM HANDLER ====== */
const SYMPTOM_CONTEXT = {
  awaitingResponse: false,
  collectedSymptoms: [],
  followUpIndex: 0
};

function handleSymptomMode(t, original) {
  // Follow-up questions flow
  if (state.symptomContext.awaitingResponse) {
    state.symptomContext.collectedSymptoms.push(original);
    return askNextFollowUp();
  }

  const symptoms = extractSymptoms(t);
  if (symptoms.length === 0) {
    return "Please tell me what symptoms you are experiencing. For example: 'I have a fever and cough' or 'My head hurts'. Be as specific as you can.";
  }

  // Check for emergency
  if (isEmergency(t)) {
    return "⚠️ **URGENT**: Your symptoms could indicate a medical emergency. Please call emergency services (911 or your local emergency number) immediately or go to the nearest emergency room. Do not wait.\n\n*This is an automated alert. Seek immediate in-person care.*";
  }

  // Start follow-up collection
  state.symptomContext = {
    awaitingResponse: true,
    collectedSymptoms: symptoms,
    followUpIndex: 0,
    originalText: original
  };

  return `I understand you are experiencing: ${symptoms.join(', ')}. Let me ask a few follow-up questions.\n\n${getFollowUpQuestion(0)}`;
}

function extractSymptoms(t) {
  const symptomMap = {
    'fever': ['fever', 'temperature', 'hot', 'chills', 'sweating'],
    'cough': ['cough', 'coughing', 'clearing throat'],
    'cold': ['cold', 'runny nose', 'stuffy nose', 'congestion', 'sneezing'],
    'headache': ['headache', 'head ache', 'migraine', 'head pain'],
    'sore throat': ['sore throat', 'throat pain', 'difficulty swallowing'],
    'stomach pain': ['stomach pain', 'abdominal pain', 'belly ache', 'stomach ache', 'nausea', 'vomiting', 'digestion'],
    'skin rash': ['rash', 'skin rash', 'itching', 'hives', 'redness', 'skin irritation'],
    'chest pain': ['chest pain', 'chest tightness', 'chest pressure'],
    'breathing difficulty': ['breathing', 'shortness of breath', 'wheezing', 'difficulty breathing'],
    'joint pain': ['joint pain', 'joint ache', 'arthritis', 'knee pain', 'back pain', 'muscle pain'],
    'fatigue': ['fatigue', 'tired', 'exhaustion', 'weakness', 'lethargy'],
    'ear pain': ['ear pain', 'ear ache', 'hearing loss', 'ear infection'],
    'eye problem': ['eye pain', 'vision', 'blurry vision', 'eye irritation'],
    'dental': ['tooth pain', 'tooth ache', 'gum pain', 'dental'],
    'dizziness': ['dizziness', 'dizzy', 'lightheaded', 'vertigo'],
    'injury': ['injury', 'fracture', 'sprain', 'swelling', 'bruise']
  };

  const found = [];
  for (const [key, keywords] of Object.entries(symptomMap)) {
    if (keywords.some(k => t.includes(k)) && !found.includes(key)) {
      found.push(key);
    }
  }
  return found;
}

function isEmergency(t) {
  const emergencyKeywords = [
    'severe chest pain', 'cannot breathe', 'not breathing', 'unconscious',
    'massive bleeding', 'severe bleeding', 'stroke', 'heart attack',
    'suicidal', 'overdose', 'poisoning', 'severe allergic reaction',
    'head injury', 'severe burn', 'severe trauma'
  ];
  return emergencyKeywords.some(k => t.includes(k));
}

const FOLLOW_UP_QUESTIONS = [
  "How long have you been experiencing these symptoms? (Hours, days, weeks?)",
  "On a scale of 1 to 10, how severe is your discomfort?",
  "What is your age group? (Child, Teen, Adult, Senior 60+)",
  "Do you have a fever? (Yes/No/Not sure)",
  "Are you experiencing any pain? If yes, where exactly?",
  "Do you have any difficulty breathing or chest discomfort?",
  "Are there any other symptoms you have noticed?"
];

function getFollowUpQuestion(index) {
  if (index < FOLLOW_UP_QUESTIONS.length) {
    return FOLLOW_UP_QUESTIONS[index];
  }
  return null;
}

function askNextFollowUp() {
  const ctx = state.symptomContext;
  ctx.followUpIndex++;

  if (ctx.followUpIndex < FOLLOW_UP_QUESTIONS.length) {
    return getFollowUpQuestion(ctx.followUpIndex);
  }

  // Done collecting — make recommendation
  const rec = getSpecialistRecommendation(ctx.collectedSymptoms, ctx.collectedSymptoms.join(' '));
  state.symptomContext = { awaitingResponse: false, collectedSymptoms: [], followUpIndex: 0 };
  return rec;
}

const SPECIALTY_MAP = {
  'fever': { specialty: 'General Physician', reason: 'Fever and general symptoms are best evaluated by a general physician for initial assessment.', urgency: 'moderate', icon: '🏥' },
  'cough': { specialty: 'General Physician or Pulmonologist', reason: 'Persistent cough may indicate respiratory issues that a physician can evaluate.', urgency: 'moderate', icon: '🫁' },
  'cold': { specialty: 'General Physician', reason: 'Common cold symptoms are typically managed by a general physician.', urgency: 'low', icon: '🏥' },
  'sore throat': { specialty: 'ENT Specialist', reason: 'Throat and ear issues are best handled by an Ear, Nose, and Throat specialist.', urgency: 'low', icon: '👂' },
  'headache': { specialty: 'Neurologist', reason: 'Recurring or severe headaches may need neurological evaluation.', urgency: 'moderate', icon: '🧠' },
  'stomach pain': { specialty: 'Gastroenterologist', reason: 'Digestive and abdominal issues are treated by gastroenterology specialists.', urgency: 'moderate', icon: '🏥' },
  'skin rash': { specialty: 'Dermatologist', reason: 'Skin conditions, rashes, and allergic reactions are treated by dermatology.', urgency: 'low', icon: '🧴' },
  'chest pain': { specialty: 'Cardiologist', reason: 'Chest pain or discomfort requires cardiac evaluation as soon as possible.', urgency: 'high', icon: '❤️' },
  'breathing difficulty': { specialty: 'Pulmonologist or Emergency Care', reason: 'Breathing issues require prompt medical attention - consider emergency care.', urgency: 'high', icon: '🫁' },
  'joint pain': { specialty: 'Orthopedist', reason: 'Bone, joint, and muscle issues are treated by orthopedic specialists.', urgency: 'low', icon: '🦴' },
  'fatigue': { specialty: 'General Physician', reason: 'Unexplained fatigue should be checked by a general physician for blood work and assessment.', urgency: 'low', icon: '🏥' },
  'ear pain': { specialty: 'ENT Specialist', reason: 'Ear infections and hearing issues are treated by ENT specialists.', urgency: 'moderate', icon: '👂' },
  'eye problem': { specialty: 'Ophthalmologist', reason: 'Vision problems and eye issues need evaluation by an eye specialist.', urgency: 'moderate', icon: '👁️' },
  'dental': { specialty: 'Dentist', reason: 'Tooth and gum pain should be evaluated by a dental professional.', urgency: 'low', icon: '🦷' },
  'dizziness': { specialty: 'Neurologist or ENT Specialist', reason: 'Dizziness can have multiple causes - a specialist evaluation is recommended.', urgency: 'moderate', icon: '🧠' },
  'injury': { specialty: 'Orthopedist', reason: 'Injuries, fractures, and sprains are treated by orthopedic specialists.', urgency: 'moderate', icon: '🦴' }
};

function getSpecialistRecommendation(symptoms, text) {
  const t = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, info] of Object.entries(SPECIALTY_MAP)) {
    let score = 0;
    if (symptoms.includes(key)) score += 3;
    const keywords = {
      'fever': ['hot', 'temperature', 'chills', 'sweating', 'thermometer'],
      'cough': ['coughing', 'phlegm', 'mucus', 'dry cough', 'wet cough'],
      'chest pain': ['chest', 'heart', 'cardiac', 'palpitations'],
      'breathing difficulty': ['wheezing', 'breathless', 'can\'t breathe', 'short of breath'],
      'stomach pain': ['abdomen', 'belly', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'gas', 'bloating'],
      'headache': ['migraine', 'head pain', 'tension', 'throbbing'],
      'skin rash': ['itching', 'hives', 'red', 'bump', 'allergic', 'irritation'],
      'joint pain': ['knee', 'back', 'spine', 'shoulder', 'hip', 'swelling', 'arthritis', 'muscle'],
      'ear pain': ['hearing', 'earache', 'infection', 'ringing'],
      'fatigue': ['tired', 'weak', 'exhaustion', 'sleep', 'energy', 'lethargy'],
      'eye problem': ['vision', 'blurry', 'eye strain', 'red eye', 'watery eye'],
      'dizziness': ['vertigo', 'lightheaded', 'faint', 'balance', 'spinning'],
      'cold': ['sneezing', 'runny', 'congestion', 'stuffy', 'sinus'],
      'sore throat': ['swallowing', 'throat pain', 'hoarse', 'tonsils']
    };
    if (keywords[key]) {
      keywords[key].forEach(kw => { if (t.includes(kw)) score += 1; });
    }
    if (score > bestScore) { bestScore = score; bestMatch = info; }
  }

  // Default if no match
  if (!bestMatch) {
    return `Based on what you described, I recommend consulting a **General Physician** for an initial evaluation. They can assess your symptoms and refer you to a specialist if needed.\n\n**Urgency**: Low to Moderate — Schedule an appointment soon.\n\n**What to do next**:\n1. ✅ Monitor your symptoms\n2. 📅 Book an appointment with a general physician\n3. 📝 Note any changes before your visit`;
  }

  const urgencyText = bestMatch.urgency === 'high' ? '⚠️ **High** — Please seek care as soon as possible' :
    bestMatch.urgency === 'moderate' ? '🟡 **Moderate** — Schedule an appointment within a few days' :
    '🟢 **Low** — This can be managed with a routine appointment';

  return `${bestMatch.icon} **Recommended Specialist**: ${bestMatch.specialty}\n\n**Why**: ${bestMatch.reason}\n\n**Urgency Level**: ${urgencyText}\n\n**What to do next**:\n1. ✅ Book an appointment with ${bestMatch.specialty === 'General Physician' ? 'a general physician' : 'the specialist'}\n2. 📝 Keep a log of your symptoms and when they occur\n3. 💊 Do not self-medicate without consulting a doctor\n4. 🚑 If symptoms worsen, seek immediate care\n\n*This is guidance, not a diagnosis. Please consult a licensed healthcare provider.*`;
}

/* ====== DIET HANDLER ====== */
const DIET_STATE = {
  awaitingGoal: true,
  goal: null,
  preferences: {},
  step: 0
};

const DIET_QUESTIONS = [
  { key: 'goal', question: 'What is your diet goal? Choose one:\n1. Weight Loss\n2. Diabetes-Friendly\n3. Heart-Healthy\n4. High-Protein\n5. Recovery Meals' },
  { key: 'diet', question: 'What type of diet do you prefer?\n1. Vegetarian\n2. Non-Vegetarian\n3. Both (flexible)' },
  { key: 'allergies', question: 'Do you have any food allergies or restrictions? (e.g., nuts, dairy, gluten, or "none")' },
  { key: 'spice', question: 'What spice level do you prefer?\n1. Mild\n2. Medium\n3. Spicy' },
  { key: 'region', question: 'Any regional cuisine preference? (e.g., North Indian, South Indian, Continental, or "any")' }
];

function handleDietMode(t, original) {
  // Check if we're in the middle of preference collection
  if (state.dietContext && state.dietContext.step > 0 && state.dietContext.step < DIET_QUESTIONS.length) {
    return collectDietPreference(t);
  }

  // Try to detect goal from text
  const goal = detectDietGoal(t);
  if (goal) {
    state.dietContext = { step: 1, goal: goal, preferences: { goal } };
    return `Great choice! Let me ask a few questions to personalize your plan.\n\n${DIET_QUESTIONS[1].question}`;
  }

  // Start from beginning
  state.dietContext = { step: 0, goal: null, preferences: {} };
  return DIET_QUESTIONS[0].question;
}

function detectDietGoal(t) {
  if (t.includes('weight loss') || t.includes('lose weight') || t.includes('slim') || t.includes('fat loss')) return 'Weight Loss';
  if (t.includes('diabetes') || t.includes('diabetic') || t.includes('sugar')) return 'Diabetes-Friendly';
  if (t.includes('heart') || t.includes('cardiac') || t.includes('cholesterol') || t.includes('blood pressure')) return 'Heart-Healthy';
  if (t.includes('protein') || t.includes('muscle') || t.includes('gym') || t.includes('workout') || t.includes('fitness')) return 'High-Protein';
  if (t.includes('recovery') || t.includes('post surgery') || t.includes('healing') || t.includes('illness')) return 'Recovery Meals';
  return null;
}

function collectDietPreference(t) {
  const ctx = state.dietContext;
  const step = ctx.step;
  const q = DIET_QUESTIONS[step];
  if (!q) return generateDietPlan(ctx);

  let value = t.trim();
  if (q.key === 'goal') value = detectDietGoal(t) || t;
  else if (q.key === 'diet') {
    if (t.includes('1') || t.includes('veg') || t.includes('vegetarian')) value = 'Vegetarian';
    else if (t.includes('2') || t.includes('non-veg') || t.includes('nonveg')) value = 'Non-Vegetarian';
    else if (t.includes('3') || t.includes('both') || t.includes('flexible')) value = 'Both';
  }
  else if (q.key === 'spice') {
    if (t.includes('1') || t.includes('mild')) value = 'Mild';
    else if (t.includes('2') || t.includes('medium')) value = 'Medium';
    else if (t.includes('3') || t.includes('spicy')) value = 'Spicy';
  }

  ctx.preferences[q.key] = value;
  ctx.step++;

  if (ctx.step < DIET_QUESTIONS.length) {
    return DIET_QUESTIONS[ctx.step].question;
  }

  return generateDietPlan(ctx);
}

function generateDietPlan(ctx) {
  const p = ctx.preferences;
  const goal = p.goal || ctx.goal;
  const dietType = p.diet || 'Both';
  const allergies = p.allergies || 'none';
  const spice = p.spice || 'Medium';
  const region = p.region || 'Any';

  const plans = {
    'Weight Loss': {
      theme: 'Calorie-controlled, nutrient-dense meals',
      breakfast: dietType === 'Vegetarian' ? 'Oats with berries, nuts, and low-fat milk' : 'Egg white omelette with spinach and whole grain toast',
      lunch: dietType === 'Vegetarian' ? 'Grilled paneer salad with quinoa and lemon dressing' : 'Grilled chicken breast with brown rice and steamed vegetables',
      dinner: 'Vegetable soup or lentil soup with a small salad',
      snacks: 'Apple slices with peanut butter, roasted chickpeas, or a handful of almonds',
      hydration: 'Drink 8-10 glasses of water. Add lemon or cucumber for flavor.',
      tips: 'Avoid sugary drinks. Eat every 3-4 hours. Control portion sizes.'
    },
    'Diabetes-Friendly': {
      theme: 'Low-glycemic, high-fiber meals',
      breakfast: 'Whole grain oats with cinnamon, nuts, and unsweetened almond milk',
      lunch: dietType === 'Vegetarian' ? 'Brown rice with dal and leafy green sabzi' : 'Grilled fish with quinoa and sautéed greens',
      dinner: 'Chickpea salad or tofu stir-fry with non-starchy vegetables',
      snacks: 'Handful of walnuts, carrot sticks with hummus, or a small apple',
      hydration: 'Stay hydrated with water and unsweetened herbal teas.',
      tips: 'Avoid white rice, bread, and sugary foods. Eat small frequent meals. Monitor carb intake.'
    },
    'Heart-Healthy': {
      theme: 'Low-sodium, healthy fats, high-fiber',
      breakfast: 'Steel-cut oats with flaxseeds, walnuts, and fresh berries',
      lunch: dietType === 'Vegetarian' ? 'Whole wheat roti with mixed vegetable curry and salad' : 'Baked salmon with sweet potato and steamed broccoli',
      dinner: 'Quinoa bowl with avocado, chickpeas, and leafy greens',
      snacks: 'Mixed nuts (unsalted), dark chocolate (70%+), fresh fruit',
      hydration: 'Aim for 8 glasses of water. Include green tea for antioxidants.',
      tips: 'Limit salt, processed foods, and saturated fats. Include omega-3 rich foods.'
    },
    'High-Protein': {
      theme: 'Protein-packed meals for muscle repair',
      breakfast: dietType === 'Vegetarian' ? 'Greek yogurt parfait with granola and protein shake' : 'Scrambled eggs with turkey bacon and protein smoothie',
      lunch: dietType === 'Vegetarian' ? 'Lentil and vegetable protein bowl with tofu' : 'Lean beef or chicken breast with sweet potato and asparagus',
      dinner: 'Grilled fish or paneer with sautéed vegetables and quinoa',
      snacks: 'Protein bars, boiled eggs, cottage cheese, or protein shakes',
      hydration: 'Drink plenty of water. Add electrolyte-rich drinks post-workout.',
      tips: 'Distribute protein across all meals. Include both plant and animal sources.'
    },
    'Recovery Meals': {
      theme: 'Nutrient-dense, easy-to-digest foods',
      breakfast: 'Smoothie with banana, spinach, protein powder, and almond milk',
      lunch: dietType === 'Vegetarian' ? 'Khichdi (rice and lentil porridge) with vegetables' : 'Chicken soup with soft vegetables and rice',
      dinner: 'Mashed potatoes with steamed fish or soft paneer',
      snacks: 'Bone broth (if non-veg), fruit purees, yogurt, and honey',
      hydration: 'Sip water throughout the day. Include coconut water and clear soups.',
      tips: 'Eat small frequent meals. Focus on soft, easily digestible foods. Stay warm.'
    }
  };

  const plan = plans[goal] || plans['Weight Loss'];
  const allergyNote = allergies !== 'none' && allergies !== 'no' ? `\n\n⚠️ **Allergy Note**: Since you mentioned ${allergies}, please verify all ingredients are safe for you and consult your doctor before making changes.` : '';

  return `🥗 **${goal} Meal Plan** — Diet: ${dietType} | Spice: ${spice} | Region: ${region}

**Theme**: ${plan.theme}

🌅 **Breakfast**: ${plan.breakfast}
🌞 **Lunch**: ${plan.lunch}
🌙 **Dinner**: ${plan.dinner}
🥨 **Snacks**: ${plan.snacks}
💧 **Hydration**: ${plan.hydration}
💡 **Tips**: ${plan.tips}

**Sample Grocery List**: Fresh vegetables, fruits, whole grains, lean protein or plant protein, nuts, seeds, healthy oils (olive/coconut), and herbs for seasoning.${allergyNote}

*This is general meal planning guidance, not medical nutrition therapy. Please consult a registered dietitian or doctor for personalized advice.*`;
}

/* ====== CHAT HELPERS ====== */
function isGreeting(t) {
  return /^(hi|hello|hey|good\s*(morning|afternoon|evening)|yo|sup|howdy|namaste|vanakkam)/i.test(t);
}
function getGreeting() {
  const h = new Date().getHours();
  const timeGreeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${timeGreeting}! 👋 I am your RK Health assistant. I can help you with:

🏥 **Appointments** — Book, view, or manage visits
💊 **Medications** — Track medicines and reminders
🤒 **Symptom Check** — Get specialist recommendations
🥗 **Diet Plans** — Personalized meal suggestions
📋 **Reports** — Generate health summaries

How can I help you today?`;
}
function getHelpText() {
  return `Here is what I can help you with:

🤒 **Symptom Check** — Describe your symptoms and I will recommend a specialist
🥗 **Diet Assistant** — Get personalized meal plans for your goals
📅 **Appointments** — View and manage your appointments
💊 **Medications** — Track your medications and reminders
📋 **Reports** — Export your health report

Try using the mode tabs above or just type your question naturally!`;
}
function getDefaultHelp() {
  return `I am not sure I understood that. Here are some things you can ask me:

• "I have a fever and headache" — for symptom analysis
• "I need a diet plan for weight loss" — for meal planning
• "Show my appointments" — to view your schedule
• "Help" — to see all available options

You can also use the shortcuts above to get started quickly!`;
}

/* ====== THREE.JS 3D SCENE ====== */
function initThreeScene() {
  const container = document.getElementById('threeContainer');
  if (!container) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const shapes = [];

  // Medical cross
  const crossGroup = new THREE.Group();
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), new THREE.MeshPhongMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.6 }));
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.4), new THREE.MeshPhongMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.6 }));
  crossGroup.add(bar1); crossGroup.add(bar2);
  crossGroup.position.set(-4, 1, -3);
  scene.add(crossGroup);
  shapes.push({ obj: crossGroup, speed: 0.003, rotY: true, rotX: true });

  // Pill (capsule)
  const pillGroup = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
  const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
  const botSphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
  topSphere.position.y = 0.4; botSphere.position.y = -0.4;
  pillGroup.add(cyl); pillGroup.add(topSphere); pillGroup.add(botSphere);
  pillGroup.position.set(3, -0.5, -4);
  scene.add(pillGroup);
  shapes.push({ obj: pillGroup, speed: 0.005, rotY: true });

  // Heartbeat ring (torus)
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 16, 48),
    new THREE.MeshPhongMaterial({ color: 0x22c55e, transparent: true, opacity: 0.4 })
  );
  torus.position.set(0, 2, -5);
  scene.add(torus);
  shapes.push({ obj: torus, speed: 0.004, rotX: true, rotZ: true });

  // Floating spheres (particles)
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.position.y = 2;
  scene.add(particles);
  shapes.push({ obj: particles, speed: 0.001, float: true });

  // Small floating shapes
  const colors = [0x14b8a6, 0x3b82f6, 0x22c55e, 0x8b5cf6];
  for (let i = 0; i < 8; i++) {
    const geo = Math.random() > 0.5 ? new THREE.IcosahedronGeometry(0.2, 0) : new THREE.OctahedronGeometry(0.2);
    const mat = new THREE.MeshPhongMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.3 + Math.random() * 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, -2 - Math.random() * 4);
    scene.add(mesh);
    shapes.push({ obj: mesh, speed: 0.002 + Math.random() * 0.004, rotY: true, rotX: Math.random() > 0.5 });
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0x14b8a6, 0.3);
  dirLight2.position.set(-5, -2, 5);
  scene.add(dirLight2);

  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, -3);

  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animate() {
    requestAnimationFrame(animate);

    shapes.forEach(s => {
      if (s.rotY) s.obj.rotation.y += s.speed;
      if (s.rotX) s.obj.rotation.x += s.speed * 0.7;
      if (s.rotZ) s.obj.rotation.z += s.speed * 0.5;
      if (s.float) {
        const time = Date.now() * 0.0005;
        s.obj.position.y = 2 + Math.sin(time + s.obj.position.x) * 0.5;
      }
    });

    // Subtle mouse follow
    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 0.3 + 1.5 - camera.position.y) * 0.02;
    camera.lookAt(0, 0.5, -3);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

/* ====== PROFILE POPUP ====== */
function toggleProfile() {
  closeNotifPanel();
  const popup = document.getElementById('profilePopup');
  if (popup.classList.contains('show')) { closeProfile(); return; }
  renderProfile();
  popup.classList.add('show');
  setTimeout(() => { document.addEventListener('click', closeProfileOutside, { once: true }); }, 10);
}
function closeProfile() {
  document.getElementById('profilePopup').classList.remove('show');
}
function closeProfileOutside(e) {
  if (!e.target.closest('.topbar-actions')) closeProfile();
}

function renderProfile() {
  const users = AUTH.getUsers();
  const info = users[AUTH.currentUser] || {};
  const isAdmin = AUTH.isAdmin();
  const isDoctor = AUTH.isDoctor();
  const isDoctorName = AUTH.getDoctorName();
  const role = isAdmin ? 'admin' : isDoctor ? 'doctor' : 'user';
  const iconName = isAdmin ? 'fa-shield-halved' : isDoctor ? 'fa-user-md' : 'fa-user';
  const roleLabel = isAdmin ? '👑 Admin' : isDoctor ? '🩺 ' + (isDoctorName || 'Doctor') : 'User';
  const colorC = isAdmin ? '#0d9488' : isDoctor ? '#3b82f6' : '#64748b';

  const appts = state.appointments.length;
  const meds = state.medications.length;
  const activeMeds = state.medications.filter(m => m.status === 'active').length;
  const summaries = state.summaries.length;
  const today = new Date().toISOString().split('T')[0];

  let todayAppts, recent;
  if (isDoctor) {
    const drName = isDoctorName;
    todayAppts = state.appointments.filter(a => a.doctor === drName && a.date === today).length;
    recent = state.appointments.filter(a => a.doctor === drName).slice(-3).map(a => ({ text: a.patient + ' — ' + (a.title || 'Visit'), date: a.date, icon: 'fa-user' }));
  } else {
    todayAppts = state.appointments.filter(a => a.date === today).length;
    recent = state.appointments.slice(-3).map(a => ({ text: 'Appointment with Dr. ' + a.doctor, date: a.date, icon: 'fa-calendar-check' }));
  }

  document.getElementById('profileHeader').innerHTML = `
    <div class="profile-avatar" style="background:${colorC}15;color:${colorC}"><i class="fas ${iconName}"></i></div>
    <h3>${info.username || AUTH.currentUser}</h3>
    <p>${info.email || 'No email set'}</p>
    <span class="profile-role ${role}">${roleLabel}</span>
    <p style="font-size:0.7rem;color:var(--text-light);margin-top:0.3rem">Member since ${new Date(info.createdAt || Date.now()).toLocaleDateString()}</p>
  `;

  document.getElementById('profileBody').innerHTML = `
    <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.5rem">📊 Summary</div>
    <div class="profile-stat-row"><span class="label">${isDoctor ? 'Today\'s Patients' : 'Appointments Today'}</span><span class="value">${todayAppts}</span></div>
    <div class="profile-stat-row"><span class="label">Total ${isDoctor ? 'Patients' : 'Appointments'}</span><span class="value">${isDoctor ? [...new Set(state.appointments.filter(a => a.doctor === isDoctorName).map(a => a.patient))].length : appts}</span></div>
    <div class="profile-stat-row"><span class="label">Active Medications</span><span class="value">${activeMeds}/${meds}</span></div>
    <div class="profile-stat-row"><span class="label">AI Summaries</span><span class="value">${summaries}</span></div>
    <div style="font-weight:600;font-size:0.85rem;margin:0.75rem 0 0.5rem">📋 ${isDoctor ? 'Recent Patients' : 'Recent Appointments'}</div>
    ${recent.length === 0 ? '<p style="font-size:0.8rem;color:var(--text-light)">No activity yet</p>' :
      recent.map(a => `<div class="profile-activity-item"><i class="fas ${a.icon}" style="color:${colorC}"></i><span>${a.text} <span style="color:var(--text-light)">· ${formatDate(a.date)}</span></span></div>`).join('')}
  `;
}

/* ====== REMINDER SYSTEM (5-min before) ====== */
const TIMING_MAP = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:00',
  night: '22:00'
};
let _notifiedTags = new Set();
let _notifHistory = [];

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showReminder(title, body, tag) {
  if (_notifiedTags.has(tag)) return;
  _notifiedTags.add(tag);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch (_) {}
  }
  showToast(`${title}: ${body}`, 'info');
  const type = tag.startsWith('appt') ? 'appt' : 'med';
  _notifHistory.unshift({ title, body, type, time: new Date().toLocaleString() });
  if (_notifHistory.length > 50) _notifHistory.length = 50;
  updateNotifBadge();
  renderNotifPanel();
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const count = _notifHistory.length;
  badge.textContent = count > 99 ? '99+' : count;
  badge.classList.toggle('show', count > 0);
}

function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (_notifHistory.length === 0) {
    list.innerHTML = '<p class="empty-state">No notifications</p>';
    return;
  }
  list.innerHTML = _notifHistory.map(n =>
    `<div class="notif-item">
      <div class="notif-icon ${n.type}"><i class="fas ${n.type === 'appt' ? 'fa-calendar-check' : 'fa-pills'}"></i></div>
      <div class="notif-content">
        <h5>${n.title}</h5>
        <p>${n.body}</p>
        <span class="notif-time">${n.time}</span>
      </div>
    </div>`
  ).join('');
}

function toggleNotifPanel() {
  closeProfile();
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const show = !panel.classList.contains('show');
  panel.classList.toggle('show', show);
  if (show) {
    renderNotifPanel();
    setTimeout(() => {
      document.addEventListener('click', closeNotifOutside, { once: true });
    }, 10);
  }
}

function closeNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.remove('show');
}

function closeNotifOutside(e) {
  if (!e.target.closest('.topbar-actions')) closeNotifPanel();
}

function clearNotifs() {
  _notifHistory = [];
  updateNotifBadge();
  renderNotifPanel();
  showToast('Notifications cleared', 'info');
}

function cleanNotifTags() {
  const cutoff = Date.now() - 7200000;
  _notifiedTags = new Set([..._notifiedTags].filter(t => {
    const ts = parseInt(t.split('|').pop());
    return !isNaN(ts) && ts > cutoff;
  }));
}

function startReminderChecker() {
  requestNotifPermission();
  checkReminders();
  setInterval(checkReminders, 30000);
  setInterval(cleanNotifTags, 600000);
}

function checkReminders() {
  if (!AUTH.currentUser) return;
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const role = AUTH.isDoctor() ? 'doctor' : 'patient';

  // --- Appointment reminders ---
  let appts = state.appointments;
  if (AUTH.isDoctor()) {
    const drName = AUTH.getDoctorName();
    appts = appts.filter(a => a.doctor === drName);
  }
  appts.forEach(a => {
    if (a.date !== today || !a.time) return;
    const [h, m] = a.time.split(':').map(Number);
    const apptDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const remindDt = new Date(apptDt.getTime() - 300000);
    const diff = Math.abs(now.getTime() - remindDt.getTime());
    if (diff < 35000) {
      const tag = `appt|${a.id}|${remindDt.getTime()}`;
      const label = AUTH.isDoctor() ? `Patient: ${a.patient}` : `Dr. ${a.doctor}`;
      showReminder('Appointment in 5 min', `${label} at ${formatTime(a.time)}${a.title ? ' — ' + a.title : ''}`, tag);
    }
  });

  // --- Medication reminders (patient only) ---
  if (AUTH.isDoctor()) return;
  state.medications.forEach(m => {
    if (m.status !== 'active' || m.timing === 'as-needed') return;
    const sched = TIMING_MAP[m.timing];
    if (!sched) return;
    const [sh, sm] = sched.split(':').map(Number);
    const schedDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm);
    const remindDt = new Date(schedDt.getTime() - 300000);
    const diff = Math.abs(now.getTime() - remindDt.getTime());
    if (diff < 35000) {
      const tag = `med|${m.id}|${remindDt.getTime()}`;
      showReminder('Medication in 5 min', `${m.name} ${m.dosage ? '— ' + m.dosage : ''} (${m.timing})`, tag);
    }
  });
}

/* ====== INIT ====== */
function initApp() {
  updateDate();
  getDoctors();
  populateSpecFilter();

  // Role-based sidebar & avatar
  const isDoctor = AUTH.isDoctor();
  const isAdmin = AUTH.isAdmin();

  // Hide patient-only sidebar links for doctors
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    const page = a.dataset.page;
    if (isDoctor) {
      a.style.display = (page === 'dashboard' || page === 'appointments' || page === 'chatbot') ? 'flex' : 'none';
    } else {
      a.style.display = 'flex';
    }
  });
  // Doctor link only for admin
  const docLink = document.querySelector('.sidebar-nav a[data-page="doctors"]');
  if (docLink) docLink.style.display = isAdmin ? 'flex' : 'none';

  // Avatar
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    if (isAdmin) {
      avatar.innerHTML = '<i class="fas fa-shield-halved" style="color:var(--teal)"></i><span style="font-size:0.7rem;margin-left:0.3rem;color:var(--teal);font-weight:600">Admin</span>';
      avatar.title = 'Administrator';
    } else if (isDoctor) {
      avatar.innerHTML = '<i class="fas fa-user-md" style="color:var(--blue)"></i><span style="font-size:0.7rem;margin-left:0.3rem;color:var(--blue);font-weight:600">' + AUTH.getDoctorName() + '</span>';
      avatar.title = 'Doctor: ' + AUTH.getDoctorName();
    } else {
      avatar.innerHTML = '<i class="fas fa-user"></i><span style="font-size:0.7rem;margin-left:0.3rem;color:var(--text-secondary)">' + AUTH.currentUser + '</span>';
      avatar.title = AUTH.currentUser;
    }
  }
  // Show role in login hint
  const hint = document.querySelector('.demo-hint');
  if (hint && !AUTH.isDoctor()) {
    hint.innerHTML = '<i class="fas fa-info-circle"></i> Admin: <strong>admin</strong> / <strong>admin123</strong> | User: <strong>demo</strong> / <strong>demo123</strong>';
  }

  // Load chat history
  const chatContainer = document.getElementById('chatMessages');
  if (state.chatHistory.length > 0) {
    state.chatHistory.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message ${msg.role}`;
      div.innerHTML = `${msg.text}<span class="msg-time">${new Date(msg.time).toLocaleTimeString()}</span>`;
      chatContainer.appendChild(div);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    setChatMode('general');
  }

  startReminderChecker();
  navigateTo('dashboard');
}

/* ====== THEME TOGGLE ====== */
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const icon = document.querySelector('#themeToggle i');
  icon.className = document.body.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
});

/* ====== LOADING SCREEN ====== */
window.addEventListener('load', () => {
  initThreeScene();
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
  }, 2000);
});
