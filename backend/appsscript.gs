/**
 * RK Health - Google Apps Script Backend
 * Deploy as Web App -> Execute as "Me" -> Access "Anyone"
 *
 * Google Sheets Structure:
 *   Sheet 1: Appointments (id, patient, doctor, date, time, title, notes, createdAt)
 *   Sheet 2: Medications (id, name, dosage, timing, phone, startDate, endDate, status, createdAt)
 *   Sheet 3: Summaries (id, appointmentId, date, title, doctor, summary, createdAt)
 */

const SHEET_NAMES = ['Appointments', 'Medications', 'Summaries', 'Doctors'];

function doGet(e) {
  return handleRequest(e, 'get');
}

function doPost(e) {
  return handleRequest(e, 'post');
}

function doPut(e) {
  return handleRequest(e, 'put');
}

function doDelete(e) {
  return handleRequest(e, 'delete');
}

function handleRequest(e, method) {
  try {
    const path = e.parameter.path || '';
    const params = JSON.parse(e.parameter.data || '{}');

    setupSheets();
    let result;

    switch (path) {
      // ---- Appointments ----
      case 'appointments/list':
        result = listRecords('Appointments', params.search, params.filter);
        break;
      case 'appointments/get':
        result = getRecord('Appointments', params.id);
        break;
      case 'appointments/add':
        result = addRecord('Appointments', params);
        break;
      case 'appointments/update':
        result = updateRecord('Appointments', params.id, params);
        break;
      case 'appointments/delete':
        result = deleteRecord('Appointments', params.id);
        break;

      // ---- Medications ----
      case 'medications/list':
        result = listRecords('Medications', params.search, params.filter);
        break;
      case 'medications/get':
        result = getRecord('Medications', params.id);
        break;
      case 'medications/add':
        result = addRecord('Medications', params);
        break;
      case 'medications/update':
        result = updateRecord('Medications', params.id, params);
        break;
      case 'medications/delete':
        result = deleteRecord('Medications', params.id);
        break;
      case 'medications/toggle':
        result = toggleMedication(params.id);
        break;

      // ---- Summaries ----
      case 'summaries/list':
        result = listRecords('Summaries');
        break;
      case 'summaries/add':
        result = addRecord('Summaries', params);
        break;
      case 'summaries/get':
        result = getRecord('Summaries', params.id);
        break;

      // ---- Doctors ----
      case 'doctors/list':
        result = listRecords('Doctors', params.search);
        break;
      case 'doctors/add':
        result = addRecord('Doctors', params);
        break;
      case 'doctors/update':
        result = updateRecord('Doctors', params.id, params);
        break;
      case 'doctors/delete':
        result = deleteRecord('Doctors', params.id);
        break;

      // ---- Dashboard Stats ----
      case 'dashboard/stats':
        result = getDashboardStats();
        break;

      // ---- Calendar Link ----
      case 'calendar/link':
        result = generateCalendarLink(params);
        break;

      default:
        return jsonResponse({ success: false, error: 'Unknown path: ' + path }, 404);
    }

    return jsonResponse({ success: true, data: result });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// ====== SHEET SETUP ======
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_NAMES.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      const headers = getHeaders(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function getHeaders(sheetName) {
  const map = {
    'Appointments': ['id', 'patient', 'doctor', 'date', 'time', 'title', 'notes', 'createdAt'],
    'Medications': ['id', 'name', 'dosage', 'timing', 'phone', 'startDate', 'endDate', 'status', 'createdAt'],
    'Summaries': ['id', 'appointmentId', 'date', 'title', 'doctor', 'summary', 'createdAt'],
    'Doctors': ['id', 'name', 'specialty', 'icon', 'color', 'desc', 'createdAt']
  };
  return map[sheetName] || [];
}

function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

// ====== CRUD OPERATIONS ======
function listRecords(sheetName, search, filter) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const headers = getHeaders(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  let records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const record = {};
    headers.forEach((h, idx) => { record[h] = row[idx] || ''; });
    records.push(record);
  }

  // Filter for appointments
  if (sheetName === 'Appointments' && filter) {
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'upcoming') records = records.filter(r => r.date >= today);
    else if (filter === 'past') records = records.filter(r => r.date < today);
  }

  // Search
  if (search) {
    const s = search.toLowerCase();
    records = records.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(s)));
  }

  // Sort by date descending
  records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return records;
}

function getRecord(sheetName, id) {
  const records = listRecords(sheetName);
  return records.find(r => r.id === id) || null;
}

function addRecord(sheetName, params) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const id = params.id || Utilities.getUuid();

  const row = headers.map(h => {
    if (h === 'id') return id;
    if (h === 'createdAt') return new Date().toISOString();
    if (h === 'status' && !params[h]) return 'active';
    return params[h] || '';
  });

  sheet.appendRow(row);
  return getRecord(sheetName, id);
}

function updateRecord(sheetName, id, params) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const row = headers.map(h => {
        if (h in params) return params[h];
        return data[i][headers.indexOf(h)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return getRecord(sheetName, id);
    }
  }
  throw new Error('Record not found: ' + id);
}

function deleteRecord(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { deleted: true, id: id };
    }
  }
  throw new Error('Record not found: ' + id);
}

function toggleMedication(id) {
  const record = getRecord('Medications', id);
  if (!record) throw new Error('Medication not found');
  record.status = record.status === 'active' ? 'completed' : 'active';
  return updateRecord('Medications', id, record);
}

// ====== DASHBOARD STATS ======
function getDashboardStats() {
  const appointments = listRecords('Appointments');
  const medications = listRecords('Medications');
  const summaries = listRecords('Summaries');
  const today = new Date().toISOString().split('T')[0];

  return {
    appointmentsToday: appointments.filter(a => a.date === today).length,
    medicationsActive: medications.filter(m => m.status === 'active').length,
    totalAppointments: appointments.length,
    totalSummaries: summaries.length,
    recentActivity: getRecentActivity(appointments, medications, summaries),
    upcomingAppointments: appointments
      .filter(a => a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 5)
  };
}

function getRecentActivity(appointments, medications, summaries) {
  const all = [
    ...appointments.map(a => ({ ...a, _type: 'appointment', _label: 'Appointment with Dr. ' + a.doctor })),
    ...medications.map(m => ({ ...m, _type: 'medication', _label: m.name + ' - ' + m.dosage })),
    ...summaries.map(s => ({ ...s, _type: 'summary', _label: 'AI Summary: ' + s.title }))
  ];
  all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return all.slice(0, 5);
}

// ====== GOOGLE CALENDAR LINK ======
function generateCalendarLink(params) {
  const title = encodeURIComponent('Appointment with Dr. ' + (params.doctor || 'Doctor'));
  const details = encodeURIComponent('Patient: ' + (params.patient || '') + '\nTitle: ' + (params.title || '') + '\nNotes: ' + (params.notes || ''));
  const location = encodeURIComponent('RK Health - ' + (params.doctor || 'Clinic'));

  let startDate, endDate;
  if (params.date && params.time) {
    const [h, m] = params.time.split(':');
    const start = new Date(params.date + 'T12:00:00');
    start.setHours(parseInt(h), parseInt(m), 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    startDate = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    endDate = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } else {
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    startDate = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    endDate = later.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;

  return {
    url: url,
    title: params.title || 'Medical Appointment',
    startDate: startDate,
    endDate: endDate
  };
}

// ====== HEALTH CHECK ======
function doHealthCheck() {
  return jsonResponse({
    success: true,
    service: 'RK Health Google Apps Script Backend',
    version: '1.0.0',
    status: 'operational',
    sheets: SpreadsheetApp.getActiveSpreadsheet().getName()
  });
}

// ====== UTILITY ======
function jsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  if (statusCode !== 200) {
    // For error responses
  }
  return output;
}
