// ============================================================
// SCHOLARSYNC — app.js
// ============================================================

// ---- STATE ----
let currentUser = null;
let currentClass = null;
let currentChat = null;
let chatMembers = [];
let activePassId = null;
let passTimerInterval = null;
let passTotal = 0;
let passRemaining = 0;
let timerInterval = null;
let timerSecs = 25 * 60;
let timerRunning = false;
let timerMode = 25;
let timerSessions = 0;
let calYear = 2026;
let calMonth = 5;
let selectedDest = '';
let selectedDestMins = 5;
let currentDeck = 'all';

const PERIODS = [
  { name: 'Arrival', start: [7,45], end: [8,20] },
  { name: '1st Block', start: [8,20], end: [9,50] },
  { name: '2nd Block', start: [9,57], end: [11,27] },
  { name: 'Lunch', start: [11,34], end: [12,8] },
  { name: '3rd Block', start: [12,13], end: [13,43] },
  { name: '4th Block', start: [13,50], end: [15,20] },
];

const HOLIDAYS = [
  { date: '2026-09-07', title: 'Labor Day', type: 'holiday' },
  { date: '2026-10-12', title: 'Columbus Day', type: 'holiday' },
  { date: '2026-11-11', title: 'Veterans Day', type: 'holiday' },
  { date: '2026-11-26', title: 'Thanksgiving', type: 'holiday' },
  { date: '2026-11-27', title: 'Thanksgiving Break', type: 'dayoff' },
  { date: '2026-12-24', title: 'Christmas Eve', type: 'holiday' },
  { date: '2026-12-25', title: 'Christmas Day', type: 'holiday' },
  { date: '2026-12-31', title: 'New Years Eve', type: 'holiday' },
  { date: '2027-01-01', title: 'New Years Day', type: 'holiday' },
  { date: '2027-01-18', title: 'MLK Day', type: 'holiday' },
  { date: '2027-02-15', title: 'Presidents Day', type: 'holiday' },
  { date: '2027-04-02', title: 'Good Friday', type: 'dayoff' },
  { date: '2027-05-31', title: 'Memorial Day', type: 'holiday' },
  { date: '2027-06-04', title: 'Last Day of School', type: 'dayoff' },
];

// ---- LS HELPERS ----
function ls(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  localStorage.setItem(key, JSON.stringify(val));
}
function lsArr(key) { return ls(key) || []; }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function genPassId() { return 'HP' + Math.floor(100000 + Math.random() * 900000); }

// ---- AUTH ----
function switchAuth(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="switchAuth('${tab}')"]`).classList.add('active');
  document.getElementById('signin-form').style.display = tab === 'signin' ? '' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? '' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = '';
}

function signIn() {
  const email = document.getElementById('si-email').value.trim();
  const pass = document.getElementById('si-password').value;
  if (!email || !pass) return showAuthError('Please fill in all fields.');
  const users = lsArr('ss_users');
  const user = users.find(u => u.email === email && u.password === pass);
  if (!user) return showAuthError('Invalid email or password.');
  if (user.role === 'teacher' && !user.approved) return showAuthError('Your teacher account is pending admin approval.');
  currentUser = user;
  ls('ss_currentUser', user);
  launchApp();
}

function signUp() {
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-password').value;
  const school = document.getElementById('su-school').value;
  const grade = document.getElementById('su-grade').value;
  const role = document.getElementById('su-role').value;
  if (!name || !email || !pass || !school || !grade) return showAuthError('Please fill in all fields.');
  const users = lsArr('ss_users');
  if (users.find(u => u.email === email)) return showAuthError('An account with this email already exists.');
  const schoolUsers = users.filter(u => u.school === school);
  const isFirstFromSchool = schoolUsers.length === 0;
  const isFounder = email === 'mykahsheppard@g.horrycountyschools.net';
  const isAdmin = isFirstFromSchool || isFounder;
  const approvedTeachers = lsArr('ss_approvedTeachers_' + school).map(e => e.toLowerCase());
  const teacherApproved = role === 'teacher' ? approvedTeachers.includes(email.toLowerCase()) : true;
  const user = { id: genId(), name, email, password: pass, school, grade, role, isAdmin, avatar: 'linear-gradient(135deg,#1a56db,#3b82f6)', approved: role === 'student' || (role === 'teacher' && teacherApproved), createdAt: Date.now() };
  users.push(user);
  ls('ss_users', users);
  if (role === 'teacher' && !teacherApproved) return showAuthError('Your teacher account requires admin approval before you can log in.');
  currentUser = user;
  ls('ss_currentUser', user);
  launchApp();
}

function signOut() {
  currentUser = null;
  ls('ss_currentUser', null);
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

function showForgot() { alert('Password reset: Please contact your school admin to reset your password.'); }

// ---- LAUNCH APP ----
function launchApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = '';
  setupUI();
  startClock();
  renderSchedule();
  renderID();
  loadWeather();
  renderHomework();
  renderDeadlines();
  renderExams();
  renderFlashcards();
  renderAbsences();
  renderCalendar();
  renderAnnouncements();
  renderClassrooms();
  renderClubs();
  renderSports();
  renderPolls();
  renderDirectory();
  renderLostFound();
  renderCarpool();
  renderChats();
  renderStudyGroups();
  renderReminders();
  renderProfile();
  nav('today');
}

function setupUI() {
  const u = currentUser;
  document.getElementById('sidebar-name').textContent = u.name;
  document.getElementById('sidebar-email').textContent = u.email;
  document.getElementById('sidebar-school').textContent = u.school;
  document.getElementById('info-email').textContent = u.email;
  document.getElementById('info-school').textContent = u.school;
  document.getElementById('info-role').textContent = u.role + (u.isAdmin ? ' (Admin)' : '');
  document.getElementById('info-grade').textContent = u.grade;
  document.getElementById('profile-name-input').value = u.name;
  const av = document.getElementById('sidebar-avatar');
  av.textContent = u.name[0].toUpperCase();
  av.style.background = u.avatar;
  if (u.isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    document.getElementById('admin-panel').style.display = '';
  }
  if (u.role === 'teacher' || u.isAdmin) {
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
    document.getElementById('teacher-panel-btn').style.display = '';
  }
  const savedTheme = ls('ss_theme');
  if (savedTheme === 'light') { document.body.classList.add('light-mode'); document.getElementById('theme-label').textContent = 'Dark Mode'; }
  renderApprovedTeachers();
}

// ---- NAV ----
function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const p = document.getElementById('page-' + page);
  if (p) p.classList.add('active');
  const btn = document.querySelector(`[onclick="nav('${page}')"]`);
  if (btn) btn.classList.add('active');
  closeSidebar();
}

// ---- SIDEBAR MOBILE ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('open');
}

// ---- THEME ----
function toggleTheme() {
  const light = document.body.classList.toggle('light-mode');
  document.getElementById('theme-label').textContent = light ? 'Dark Mode' : 'Light Mode';
  ls('ss_theme', light ? 'light' : 'dark');
}

// ---- CLOCK ----
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  const timeStr = `${hh}:${pad(m)}:${pad(s)} ${ampm}`;
  document.getElementById('clock').textContent = timeStr;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('clock-date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  updatePeriod(h, m);
}
function pad(n) { return String(n).padStart(2, '0'); }
function updatePeriod(h, m) {
  const totalMins = h * 60 + m;
  let cur = null;
  for (const p of PERIODS) {
    const start = p.start[0] * 60 + p.start[1];
    const end = p.end[0] * 60 + p.end[1];
    if (totalMins >= start && totalMins < end) { cur = { ...p, start, end }; break; }
  }
  ['period-name','sched-period'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = cur ? cur.name : 'No class';
  });
  if (cur) {
    const left = cur.end - totalMins;
    const pct = ((totalMins - cur.start) / (cur.end - cur.start) * 100).toFixed(1);
    const timeStr = `${Math.floor(left / 60)}:${pad(left % 60)}`;
    ['period-time','sched-time'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = timeStr; });
    ['period-progress','sched-progress'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; });
  } else {
    ['period-time','sched-time'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  }
}

// ---- SCHEDULE ----
function renderSchedule() {
  const saved = ls('ss_schedule') || {};
  const body = document.getElementById('schedule-body');
  body.innerHTML = '';
  PERIODS.forEach((p, i) => {
    const tr = document.createElement('tr');
    const savedName = saved['period' + i] || '';
    tr.innerHTML = `<td>${p.name}</td><td>${pad(p.start[0])}:${pad(p.start[1])} – ${pad(p.end[0])}:${pad(p.end[1])}</td><td><input class="input" style="margin:0;padding:6px 10px;" placeholder="Your class name..." value="${savedName}" oninput="tempSavePeriod(${i}, this.value)"></td>`;
    body.appendChild(tr);
  });
  populateClassDropdowns();
}
function tempSavePeriod(i, val) {
  const saved = ls('ss_schedule') || {};
  saved['period' + i] = val;
  ls('ss_schedule', saved);
  populateClassDropdowns();
}
function saveSchedule() {
  alert('Schedule saved!');
  populateClassDropdowns();
}
function populateClassDropdowns() {
  const saved = ls('ss_schedule') || {};
  const classes = Object.values(saved).filter(Boolean);
  ['hw-task-class','dl-class','notes-class-select'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Select class...</option>';
    classes.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; el.appendChild(opt); });
    if (current) el.value = current;
  });
}

// ---- STUDENT ID ----
function renderID() {
  const idData = ls('ss_idCard') || {};
  document.getElementById('id-name').textContent = currentUser.name;
  document.getElementById('id-school-label').textContent = currentUser.school;
  document.getElementById('id-grade-display').textContent = idData.grade || currentUser.grade || '—';
  document.getElementById('id-num-display').textContent = idData.idNumber || '—';
  document.getElementById('id-grade-input').value = idData.grade || '';
  document.getElementById('id-num-input').value = idData.idNumber || '';
  const av = document.getElementById('id-avatar');
  av.textContent = currentUser.name[0].toUpperCase();
  av.style.background = currentUser.avatar;
  const bc = document.getElementById('id-barcode');
  bc.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('span');
    const w = [1,1,2,2,1,3][Math.floor(Math.random() * 6)];
    const h = 16 + Math.random() * 16;
    s.style.cssText = `width:${w}px;height:${h}px;display:inline-block;`;
    bc.appendChild(s);
  }
}
function saveID() {
  const grade = document.getElementById('id-grade-input').value;
  const idNumber = document.getElementById('id-num-input').value.trim();
  ls('ss_idCard', { grade, idNumber });
  document.getElementById('id-grade-display').textContent = grade || '—';
  document.getElementById('id-num-display').textContent = idNumber || '—';
  alert('ID saved!');
}

// ---- WEATHER ----
async function loadWeather() {
  const card = document.getElementById('weather-card');
  card.innerHTML = '<div class="weather-loading">Loading weather...</div>';
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.6890&longitude=-78.8867&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m&timezone=America/New_York&forecast_days=1');
    const data = await res.json();
    const cw = data.current_weather;
    const tempF = Math.round(cw.temperature * 9/5 + 32);
    const feelsF = Math.round((data.hourly.apparent_temperature[0] || cw.temperature) * 9/5 + 32);
    const humidity = data.hourly.relativehumidity_2m[0] || '—';
    const wind = Math.round((data.hourly.windspeed_10m[0] || cw.windspeed) * 0.621371);
    const code = cw.weathercode;
    let cond = '☀️ Clear', desc = 'Clear skies';
    if (code >= 1 && code <= 3) { cond = '⛅ Partly Cloudy'; desc = 'Partly cloudy'; }
    if (code >= 51 && code <= 67) { cond = '🌧️ Rain'; desc = 'Rainy'; }
    if (code >= 71 && code <= 77) { cond = '❄️ Snow'; desc = 'Snowing'; }
    if (code >= 80 && code <= 82) { cond = '🌦️ Showers'; desc = 'Light showers'; }
    if (code >= 95) { cond = '⛈️ Thunderstorm'; desc = 'Thunderstorms'; }
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:20px;">
        <div>
          <div class="weather-big-temp">${tempF}°F</div>
          <div class="weather-condition">${cond}</div>
          <div style="font-size:13px;color:var(--gray)">📍 Myrtle Beach, SC</div>
        </div>
      </div>
      <div class="weather-details-grid">
        <div class="weather-detail-card"><div class="weather-detail-val">${feelsF}°</div><div class="weather-detail-label">Feels Like</div></div>
        <div class="weather-detail-card"><div class="weather-detail-val">${humidity}%</div><div class="weather-detail-label">Humidity</div></div>
        <div class="weather-detail-card"><div class="weather-detail-val">${wind}</div><div class="weather-detail-label">Wind mph</div></div>
      </div>`;
  } catch { card.innerHTML = '<div class="weather-loading">Could not load weather. Check your connection.</div>'; }
}

// ---- HOMEWORK ----
function renderHomework() {
  const items = lsArr('ss_homework_' + currentUser.id);
  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  const pEl = document.getElementById('hw-pending');
  const dEl = document.getElementById('hw-done');
  pEl.innerHTML = pending.length ? pending.map(hwHTML).join('') : '<div class="empty-state">No pending tasks 🎉</div>';
  dEl.innerHTML = done.length ? done.map(hwHTML).join('') : '<div class="empty-state">Nothing completed yet</div>';
  const todayHW = document.getElementById('today-hw-list');
  if (todayHW) todayHW.innerHTML = pending.length ? pending.slice(0,3).map(i => `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div></div>`).join('') : '<div class="empty-state">No homework due today 🎉</div>';
}
function hwHTML(i) {
  return `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div style="flex:1"><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div><button class="btn-ghost btn-sm" onclick="deleteHW('${i.id}')">×</button></div>`;
}
function addHW() {
  const text = document.getElementById('hw-task-name').value.trim();
  const cls = document.getElementById('hw-task-class').value;
  if (!text) return;
  const items = lsArr('ss_homework_' + currentUser.id);
  items.unshift({ id: genId(), text, cls, done: false, date: new Date().toISOString().split('T')[0] });
  ls('ss_homework_' + currentUser.id, items);
  renderHomework();
  closeAllModals();
  document.getElementById('hw-task-name').value = '';
}
function toggleHW(id) {
  const items = lsArr('ss_homework_' + currentUser.id);
  const item = items.find(i => i.id === id);
  if (item) item.done = !item.done;
  ls('ss_homework_' + currentUser.id, items);
  renderHomework();
}
function deleteHW(id) {
  ls('ss_homework_' + currentUser.id, lsArr('ss_homework_' + currentUser.id).filter(i => i.id !== id));
  renderHomework();
}

// ---- NOTES ----
function saveNote() {
  const cls = document.getElementById('notes-class-select').value;
  const text = document.getElementById('notes-editor').value.trim();
  if (!cls || !text) return alert('Select a class and write some notes first!');
  const notes = lsArr('ss_notes_' + currentUser.id);
  const existing = notes.find(n => n.cls === cls);
  if (existing) existing.text = text;
  else notes.push({ id: genId(), cls, text, updatedAt: Date.now() });
  ls('ss_notes_' + currentUser.id, notes);
  renderNotesList();
  alert('Note saved!');
}
function renderNotesList() {
  const notes = lsArr('ss_notes_' + currentUser.id);
  const list = document.getElementById('notes-list');
  list.innerHTML = notes.length ? notes.map(n => `<div class="note-item" onclick="loadNoteItem('${n.id}')"><div class="note-item-class">${n.cls}</div>${n.text.slice(0,60)}...</div>`).join('') : '<div class="empty-state">No notes saved</div>';
}
function loadNote() {
  const cls = document.getElementById('notes-class-select').value;
  const notes = lsArr('ss_notes_' + currentUser.id);
  const found = notes.find(n => n.cls === cls);
  document.getElementById('notes-editor').value = found ? found.text : '';
}
function loadNoteItem(id) {
  const notes = lsArr('ss_notes_' + currentUser.id);
  const note = notes.find(n => n.id === id);
  if (note) {
    document.getElementById('notes-class-select').value = note.cls;
    document.getElementById('notes-editor').value = note.text;
  }
}

// ---- DEADLINES ----
function renderDeadlines() {
  const items = lsArr('ss_deadlines_' + currentUser.id).sort((a,b) => new Date(a.date) - new Date(b.date));
  const el = document.getElementById('dl-list');
  el.innerHTML = items.length ? items.map(dl => {
    const days = Math.ceil((new Date(dl.date) - new Date()) / 86400000);
    const cls = days <= 3 ? 'dl-red' : days <= 7 ? 'dl-gold' : 'dl-blue';
    const label = days < 0 ? 'PAST DUE' : days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days}`;
    return `<div class="deadline-card"><div class="deadline-days ${cls}">${label}</div><div class="deadline-info"><div class="deadline-name">${dl.name}</div><div class="deadline-meta">${dl.cls} • ${dl.type} • ${dl.date}</div></div><button class="btn-ghost btn-sm" onclick="deleteDeadline('${dl.id}')">×</button></div>`;
  }).join('') : '<div class="empty-state">No deadlines added yet</div>';
  renderDashDeadlines();
}
function addDeadline() {
  const name = document.getElementById('dl-name').value.trim();
  const cls = document.getElementById('dl-class').value;
  const type = document.getElementById('dl-type').value;
  const date = document.getElementById('dl-date').value;
  if (!name || !date) return;
  const items = lsArr('ss_deadlines_' + currentUser.id);
  items.push({ id: genId(), name, cls, type, date });
  ls('ss_deadlines_' + currentUser.id, items);
  renderDeadlines();
  closeAllModals();
  document.getElementById('dl-name').value = ''; document.getElementById('dl-date').value = '';
}
function deleteDeadline(id) {
  ls('ss_deadlines_' + currentUser.id, lsArr('ss_deadlines_' + currentUser.id).filter(i => i.id !== id));
  renderDeadlines();
}
function renderDashDeadlines() {
  const items = lsArr('ss_deadlines_' + currentUser.id).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,5);
  const el = document.getElementById('dash-deadlines');
  if (!el) return;
  el.innerHTML = items.length ? items.map(dl => {
    const days = Math.ceil((new Date(dl.date) - new Date()) / 86400000);
    const cls = days <= 3 ? 'dl-red' : days <= 7 ? 'dl-gold' : 'dl-blue';
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${dl.name}</span><span class="${cls}" style="font-weight:700">${days <= 0 ? 'TODAY' : days + 'd'}</span></div>`;
  }).join('') : '<div class="empty-state">No upcoming deadlines</div>';
  document.getElementById('stat-due').textContent = items.filter(d => Math.ceil((new Date(d.date) - new Date()) / 86400000) <= 7 && Math.ceil((new Date(d.date) - new Date()) / 86400000) >= 0).length;
}

// ---- EXAMS ----
function renderExams() {
  const items = lsArr('ss_exams_' + currentUser.id).sort((a,b) => new Date(a.date) - new Date(b.date));
  const el = document.getElementById('exam-list');
  el.innerHTML = items.length ? items.map(ex => {
    const days = Math.ceil((new Date(ex.date) - new Date()) / 86400000);
    const cls = days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#3b82f6';
    const label = days === 0 ? 'TODAY!' : days < 0 ? 'PAST' : days;
    return `<div class="exam-card"><div class="exam-days" style="color:${cls}">${label}</div><div style="font-size:11px;color:var(--gray);margin-top:2px;">${days > 0 ? 'DAYS LEFT' : ''}</div><div class="exam-name">${ex.name}</div><div class="exam-subject">${ex.subject}</div><div class="exam-date">${ex.date}</div><button class="btn-ghost btn-sm" style="margin-top:10px;width:100%;" onclick="deleteExam('${ex.id}')">Delete</button></div>`;
  }).join('') : '<div class="empty-state">No exams added yet</div>';
}
function addExam() {
  const name = document.getElementById('exam-name').value.trim();
  const subject = document.getElementById('exam-subject').value.trim();
  const date = document.getElementById('exam-date').value;
  if (!name || !date) return;
  const items = lsArr('ss_exams_' + currentUser.id);
  items.push({ id: genId(), name, subject, date });
  ls('ss_exams_' + currentUser.id, items);
  renderExams(); closeAllModals();
  document.getElementById('exam-name').value = ''; document.getElementById('exam-subject').value = ''; document.getElementById('exam-date').value = '';
}
function deleteExam(id) { ls('ss_exams_' + currentUser.id, lsArr('ss_exams_' + currentUser.id).filter(i => i.id !== id)); renderExams(); }

// ---- STUDY TIMER ----
function setTimerMode(mins, label, el) {
  document.querySelectorAll('.timer-mode-row .btn-ghost').forEach(b => b.classList.remove('active-mode'));
  el.classList.add('active-mode');
  timerMode = mins; timerSecs = mins * 60; timerRunning = false;
  clearInterval(timerInterval);
  document.getElementById('timer-display').textContent = `${pad(mins)}:00`;
  document.getElementById('timer-label').textContent = label + ' Session';
  document.getElementById('timer-start-btn').textContent = 'Start';
}
function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false;
    document.getElementById('timer-start-btn').textContent = 'Resume';
  } else {
    timerRunning = true; document.getElementById('timer-start-btn').textContent = 'Pause';
    timerInterval = setInterval(() => {
      if (timerSecs <= 0) {
        clearInterval(timerInterval); timerRunning = false;
        timerSessions++; document.getElementById('timer-sessions').textContent = timerSessions + 1;
        document.getElementById('timer-start-btn').textContent = 'Start';
        timerSecs = timerMode * 60;
        document.getElementById('timer-display').textContent = `${pad(timerMode)}:00`;
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA').play(); } catch {}
        return;
      }
      timerSecs--;
      document.getElementById('timer-display').textContent = `${pad(Math.floor(timerSecs/60))}:${pad(timerSecs%60)}`;
    }, 1000);
  }
}
function resetTimer() { clearInterval(timerInterval); timerRunning = false; timerSecs = timerMode * 60; document.getElementById('timer-display').textContent = `${pad(timerMode)}:00`; document.getElementById('timer-start-btn').textContent = 'Start'; }

// ---- FLASHCARDS ----
function renderFlashcards() {
  const cards = lsArr('ss_flashcards_' + currentUser.id);
  const decks = [...new Set(cards.map(c => c.deck))];
  const tabsEl = document.getElementById('deck-tabs');
  tabsEl.innerHTML = `<button class="deck-tab${currentDeck==='all'?' active':''}" onclick="filterDeck('all')">All</button>` + decks.map(d => `<button class="deck-tab${currentDeck===d?' active':''}" onclick="filterDeck('${d}')">${d}</button>`).join('');
  const filtered = currentDeck === 'all' ? cards : cards.filter(c => c.deck === currentDeck);
  const grid = document.getElementById('fc-grid');
  grid.innerHTML = filtered.length ? filtered.map(c => `<div class="fc-card" onclick="this.classList.toggle('flipped')"><div class="fc-inner"><div class="fc-front-face"><div><div class="fc-deck-label">${c.deck}</div>${c.front}</div></div><div class="fc-back-face">${c.back}</div></div></div>`).join('') : '<div class="empty-state">No flashcards yet</div>';
}
function filterDeck(deck) { currentDeck = deck; renderFlashcards(); }
function addFlashcard() {
  const deck = document.getElementById('fc-deck').value.trim();
  const front = document.getElementById('fc-front').value.trim();
  const back = document.getElementById('fc-back').value.trim();
  if (!deck || !front || !back) return;
  const cards = lsArr('ss_flashcards_' + currentUser.id);
  cards.push({ id: genId(), deck, front, back });
  ls('ss_flashcards_' + currentUser.id, cards);
  renderFlashcards(); closeAllModals();
  ['fc-deck','fc-front','fc-back'].forEach(id => document.getElementById(id).value = '');
}

// ---- ABSENCES ----
function renderAbsences() {
  const items = lsArr('ss_absences_' + currentUser.id);
  const unex = items.filter(i => i.type === 'Unexcused').length;
  const ex = items.filter(i => ['Parent Excused','Medical','College Visit'].includes(i.type)).length;
  const tard = items.filter(i => i.type === 'Tardy').length;
  document.getElementById('abs-total').textContent = items.length;
  document.getElementById('abs-unex').textContent = unex;
  document.getElementById('abs-ex').textContent = ex;
  document.getElementById('abs-tard').textContent = tard;
  document.getElementById('stat-abs').textContent = unex;
  const warnings = document.getElementById('abs-warnings');
  warnings.innerHTML = '';
  if (unex >= 3) warnings.innerHTML += `<div class="abs-warning">⚠️ ${unex} unexcused absences — AIP risk!</div>`;
  if (tard >= 3) warnings.innerHTML += `<div class="abs-warning">⚠️ ${tard} tardies = ${Math.floor(tard/3)} unexcused absence(s)</div>`;
  const log = document.getElementById('abs-log');
  log.innerHTML = items.length ? items.map(i => {
    const badgeCls = i.type === 'Unexcused' ? 'badge-unex' : i.type === 'Tardy' ? 'badge-tardy' : 'badge-excused';
    return `<div class="abs-log-item"><span class="abs-type-badge ${badgeCls}">${i.type}</span><span>${i.date}</span><span style="color:var(--gray)">${i.cls}</span><button class="btn-ghost btn-sm" onclick="deleteAbsence('${i.id}')">×</button></div>`;
  }).join('') : '<div class="empty-state">No absences logged</div>';
}
function logAbsence() {
  const date = document.getElementById('abs-date').value;
  const type = document.getElementById('abs-type').value;
  const cls = document.getElementById('abs-class').value.trim();
  if (!date) return;
  const items = lsArr('ss_absences_' + currentUser.id);
  items.unshift({ id: genId(), date, type, cls });
  ls('ss_absences_' + currentUser.id, items);
  renderAbsences(); closeAllModals();
}
function deleteAbsence(id) { ls('ss_absences_' + currentUser.id, lsArr('ss_absences_' + currentUser.id).filter(i => i.id !== id)); renderAbsences(); }

// ---- CALENDAR ----
let selectedCalDate = '';
function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${months[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div'); el.className = 'cal-day-label'; el.textContent = d; grid.appendChild(el);
  });
  const first = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = new Date();
  const events = lsArr('ss_calEvents_' + currentUser.id);
  for (let i = 0; i < first; i++) {
    const div = document.createElement('div'); div.className = 'cal-day other-month';
    div.textContent = new Date(calYear, calMonth, 1-first+i).getDate(); grid.appendChild(div);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const div = document.createElement('div'); div.className = 'cal-day'; div.textContent = d;
    if (d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) div.classList.add('today');
    const dayEvents = [...events.filter(e => e.date === dateStr), ...HOLIDAYS.filter(h => h.date === dateStr)];
    if (dayEvents.length) {
      const dots = document.createElement('div'); dots.className = 'cal-dots';
      dayEvents.slice(0,3).forEach(e => {
        const dot = document.createElement('div'); dot.className = 'cal-dot';
        const colors = { personal:'#3b82f6', reminder:'#f59e0b', deadline:'#ef4444', school:'#1a56db', holiday:'#f59e0b', dayoff:'#22c55e' };
        dot.style.background = colors[e.type] || '#3b82f6'; dots.appendChild(dot);
      });
      div.appendChild(dots);
    }
    div.onclick = () => openCalDay(dateStr, months[calMonth] + ' ' + d);
    grid.appendChild(div);
  }
}
function changeMonth(dir) { calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function openCalDay(date, label) {
  selectedCalDate = date;
  document.getElementById('cal-modal-title').textContent = `Events for ${label}`;
  const events = lsArr('ss_calEvents_' + currentUser.id).filter(e => e.date === date);
  const holidays = HOLIDAYS.filter(h => h.date === date);
  const all = [...holidays, ...events];
  const evEl = document.getElementById('cal-modal-events');
  evEl.innerHTML = all.length ? all.map(e => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e.title}</span>${e.uid === currentUser.id || currentUser.isAdmin ? `<button class="btn-ghost btn-sm" onclick="deleteCalEvent('${e.id}')">×</button>` : ''}</div>`).join('') : '<div class="empty-state" style="padding:8px 0;">No events this day</div>';
  if (!currentUser.isAdmin) {
    const schoolOpt = document.querySelector('#cal-event-type option[value="school"]');
    if (schoolOpt) schoolOpt.disabled = true;
  }
  openModal('cal-modal');
}
function addCalEvent() {
  const title = document.getElementById('cal-event-title').value.trim();
  const type = document.getElementById('cal-event-type').value;
  if (!title) return;
  if (type === 'school' && !currentUser.isAdmin) return alert('Only admins can post school events.');
  const events = lsArr('ss_calEvents_' + currentUser.id);
  events.push({ id: genId(), date: selectedCalDate, title, type, uid: currentUser.id });
  ls('ss_calEvents_' + currentUser.id, events);
  renderCalendar(); closeAllModals();
  document.getElementById('cal-event-title').value = '';
}
function deleteCalEvent(id) {
  ls('ss_calEvents_' + currentUser.id, lsArr('ss_calEvents_' + currentUser.id).filter(e => e.id !== id));
  renderCalendar(); closeAllModals();
}

// ---- ANNOUNCEMENTS ----
function renderAnnouncements() {
  const items = lsArr('ss_announcements_' + currentUser.school).sort((a,b) => b.createdAt - a.createdAt);
  const el = document.getElementById('ann-list');
  el.innerHTML = items.length ? items.map(a => `<div class="ann-card"><div class="ann-title">${a.title}</div><div class="ann-body">${a.body}</div><div class="ann-meta"><span>📌 ${a.postedByName} • ${new Date(a.createdAt).toLocaleDateString()}</span>${currentUser.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteAnnouncement('${a.id}')">Delete</button>`:''}</div></div>`).join('') : '<div class="empty-state">No announcements yet</div>';
  const latest = items[0];
  const todayAnn = document.getElementById('today-ann');
  if (todayAnn) todayAnn.innerHTML = latest ? `<div style="font-size:14px;font-weight:600;margin-bottom:4px;">${latest.title}</div><div style="font-size:12px;color:var(--gray)">${latest.body.slice(0,100)}...</div>` : '<div class="empty-state">No announcements yet</div>';
}
function postAnnouncement() {
  if (!currentUser.isAdmin) return;
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if (!title || !body) return;
  const items = lsArr('ss_announcements_' + currentUser.school);
  items.push({ id: genId(), title, body, postedBy: currentUser.id, postedByName: currentUser.name, school: currentUser.school, createdAt: Date.now() });
  ls('ss_announcements_' + currentUser.school, items);
  renderAnnouncements(); closeAllModals();
  document.getElementById('ann-title').value = ''; document.getElementById('ann-body').value = '';
}
function deleteAnnouncement(id) {
  ls('ss_announcements_' + currentUser.school, lsArr('ss_announcements_' + currentUser.school).filter(a => a.id !== id));
  renderAnnouncements();
}

// ---- CLASSROOMS ----
function renderClassrooms() {
  const allClasses = lsArr('ss_classrooms_' + currentUser.school);
  const myClasses = currentUser.role === 'teacher'
    ? allClasses.filter(c => c.teacherUid === currentUser.id)
    : allClasses.filter(c => c.students.includes(currentUser.id));
  const el = document.getElementById('classroom-list');
  el.innerHTML = myClasses.length ? myClasses.map(c => `<div class="class-card" onclick="openClassroom('${c.id}')"><div class="class-banner" style="background:${c.color}"></div><div class="class-card-body"><div class="class-card-name">${c.name}</div><div class="class-card-teacher">${c.teacherName} • ${c.subject}</div><div class="class-card-code" style="margin-top:8px;">CODE: ${c.code}</div></div></div>`).join('') : '<div class="empty-state">No classes yet. Join a class with a code!</div>';
  document.getElementById('stat-classes').textContent = myClasses.length;
  const dashEl = document.getElementById('dash-classrooms');
  if (dashEl) dashEl.innerHTML = myClasses.length ? myClasses.map(c => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="nav('classroom')"><div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;"></div><span style="font-size:14px;flex:1;">${c.name}</span><span style="font-size:12px;color:var(--gray)">${c.subject}</span></div>`).join('') : '<div class="empty-state">No classes joined yet</div>';
}
function openClassroom(id) {
  const allClasses = lsArr('ss_classrooms_' + currentUser.school);
  const cls = allClasses.find(c => c.id === id);
  if (!cls) return;
  currentClass = cls;
  document.getElementById('cd-title').textContent = cls.name;
  document.getElementById('cd-sub').textContent = cls.teacherName + ' • ' + cls.subject;
  const isTeacher = currentUser.role === 'teacher' && cls.teacherUid === currentUser.id;
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = isTeacher ? '' : 'none');
  renderClassroomDetail();
  nav('classroom-detail');
}
function renderClassroomDetail() {
  if (!currentClass) return;
  const grades = currentClass.grades || {};
  const assignments = currentClass.assignments || [];
  const myGrades = assignments.map(a => ({ ...a, grade: (grades[a.id] || {})[currentUser.id] }));
  const scored = myGrades.filter(a => a.grade !== undefined && a.grade !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.grade * (a.weight / 100)), 0) / scored.reduce((s, a) => s + a.weight / 100, 0)) : null;
  const gc = document.getElementById('cd-grade-circle');
  gc.textContent = avg !== null ? avg + '%' : '—';
  gc.style.background = avg >= 90 ? '#22c55e' : avg >= 80 ? '#1a56db' : avg >= 70 ? '#f59e0b' : avg !== null ? '#ef4444' : '#1a56db';
  document.getElementById('stat-grade').textContent = avg !== null ? avg + '%' : '—';
  const al = document.getElementById('cd-assignments-list');
  al.innerHTML = myGrades.length ? myGrades.map(a => `<div class="assignment-row"><div style="flex:1"><div class="assignment-name">${a.name}</div><div style="font-size:11px;color:var(--gray)">${a.category} • Weight: ${a.weight}%</div></div><div class="assignment-grade" style="color:${a.grade>=90?'#22c55e':a.grade>=70?'#3b82f6':'#ef4444'}">${a.grade !== undefined && a.grade !== null ? a.grade : '—'}</div></div>`).join('') : '<div class="empty-state">No assignments posted yet</div>';
  const tl = document.getElementById('cd-assignments-teacher-list');
  if (tl) tl.innerHTML = assignments.length ? assignments.map(a => `<div class="assignment-row"><div style="flex:1"><div class="assignment-name">${a.name}</div><div style="font-size:11px;color:var(--gray)">${a.category} • Weight: ${a.weight}%</div></div><button class="btn-ghost btn-sm" onclick="openGradeInput('${a.id}')">Enter Grades</button></div>`).join('') : '<div class="empty-state">No assignments posted yet</div>';
  const sl = document.getElementById('cd-students-list');
  if (sl) sl.innerHTML = currentClass.students.length ? currentClass.students.map(uid => { const u = (lsArr('ss_users')).find(u => u.id === uid); return u ? `<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div><div><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div></div>` : ''; }).join('') : '<div class="empty-state">No students yet</div>';
  renderPassPanels();
}
function openGradeInput(assignmentId) {
  const grade = prompt('Enter grade (0-100):');
  if (grade === null) return;
  const studentId = prompt('Enter student ID to grade:');
  if (!studentId) return;
  const classes = lsArr('ss_classrooms_' + currentUser.school);
  const cls = classes.find(c => c.id === currentClass.id);
  if (!cls.grades) cls.grades = {};
  if (!cls.grades[assignmentId]) cls.grades[assignmentId] = {};
  cls.grades[assignmentId][studentId] = parseInt(grade);
  ls('ss_classrooms_' + currentUser.school, classes);
  currentClass = cls;
  renderClassroomDetail();
}
function joinClass() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!code || code.length !== 6) return alert('Please enter a valid 6-character class code.');
  const classes = lsArr('ss_classrooms_' + currentUser.school);
  const cls = classes.find(c => c.code === code);
  if (!cls) return alert('Class not found. Check the code and try again.');
  if (cls.students.includes(currentUser.id)) return alert('You are already in this class!');
  if (cls.students.length >= 8) return alert('This class is full (max 8 students).');
  cls.students.push(currentUser.id);
  ls('ss_classrooms_' + currentUser.school, classes);
  renderClassrooms(); closeAllModals();
  alert('Joined ' + cls.name + '!');
}
function createClass() {
  if (currentUser.role !== 'teacher' && !currentUser.isAdmin) return;
  const name = document.getElementById('cc-name').value.trim();
  const subject = document.getElementById('cc-subject').value.trim();
  const semester = document.getElementById('cc-semester').value;
  const color = document.getElementById('cc-color').value;
  if (!name || !subject) return;
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  const classes = lsArr('ss_classrooms_' + currentUser.school);
  classes.push({ id: genId(), name, subject, semester, color, code, teacherUid: currentUser.id, teacherName: currentUser.name, school: currentUser.school, students: [], assignments: [], grades: {}, createdAt: Date.now() });
  ls('ss_classrooms_' + currentUser.school, classes);
  renderClassrooms(); closeAllModals();
  alert('Class created! Share code: ' + code);
}
function postAssignment() {
  if (!currentClass) return;
  const name = document.getElementById('pa-name').value.trim();
  const category = document.getElementById('pa-category').value;
  const weight = parseInt(document.getElementById('pa-weight').value) || 10;
  const due = document.getElementById('pa-due').value;
  if (!name) return;
  const classes = lsArr('ss_classrooms_' + currentUser.school);
  const cls = classes.find(c => c.id === currentClass.id);
  if (!cls.assignments) cls.assignments = [];
  cls.assignments.push({ id: genId(), name, category, weight, due });
  ls('ss_classrooms_' + currentUser.school, classes);
  currentClass = cls;
  renderClassroomDetail(); closeAllModals();
  document.getElementById('pa-name').value = '';
}
function switchCDTab(tab, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  ['grades','students','assignments','passes'].forEach(t => {
    const el2 = document.getElementById('cd-' + t + '-tab');
    if (el2) el2.style.display = t === tab ? '' : 'none';
  });
}
function calcWhatIf() {
  const score = parseFloat(document.getElementById('whatif-score').value);
  const weight = parseFloat(document.getElementById('whatif-weight').value) || 10;
  if (isNaN(score)) return;
  const result = (score * weight / 100).toFixed(1);
  document.getElementById('whatif-result').textContent = `This assignment would contribute ${result} points to your grade.`;
}

// ---- HALL PASS ----
function openPassRequest() {
  if (!currentClass) return;
  document.getElementById('dest-grid').style.display = 'grid';
  document.getElementById('pass-pending-screen').style.display = 'none';
  document.getElementById('pass-mobile-view').style.display = 'none';
  document.getElementById('pass-desktop-view').style.display = 'none';
  document.getElementById('pass-request-screen').style.display = '';
  nav('hallpass');
}
function selectDest(el, dest, mins) {
  document.querySelectorAll('.dest-card').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  selectedDest = dest; selectedDestMins = mins;
  setTimeout(() => submitPassRequest(), 300);
}
function submitPassRequest() {
  const passId = genPassId();
  const pass = { id: genId(), passId, studentUid: currentUser.id, studentName: currentUser.name, classId: currentClass.id, destination: selectedDest, duration: selectedDestMins, status: 'pending', school: currentUser.school, requestedAt: Date.now(), message: null, studentReply: null, used: false };
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  passes.push(pass);
  ls('ss_hallpasses_' + currentUser.school, passes);
  activePassId = pass.id;
  document.getElementById('dest-grid').style.display = 'none';
  document.getElementById('pass-request-screen').style.display = 'none';
  document.getElementById('pass-pending-screen').style.display = '';
  simulateTeacherApproval(pass.id);
}
function simulateTeacherApproval(passId) {
  setTimeout(() => {
    const passes = lsArr('ss_hallpasses_' + currentUser.school);
    const pass = passes.find(p => p.id === passId);
    if (pass && pass.status === 'pending') {
      pass.status = 'active';
      pass.approvedAt = Date.now();
      pass.approvedBy = 'Teacher';
      ls('ss_hallpasses_' + currentUser.school, passes);
      showActivePass(pass);
    }
  }, 2000);
}
function showActivePass(pass) {
  document.getElementById('pass-pending-screen').style.display = 'none';
  const isMobile = window.innerWidth <= 768;
  document.getElementById('pass-mobile-view').style.display = isMobile ? '' : 'none';
  document.getElementById('pass-desktop-view').style.display = isMobile ? 'none' : '';
  const issued = new Date(pass.approvedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  document.getElementById('pass-avatar').textContent = currentUser.name[0];
  document.getElementById('pass-avatar').style.background = currentUser.avatar || '#22c55e';
  document.getElementById('pass-student-name').textContent = currentUser.name;
  document.getElementById('pass-school-name').textContent = currentUser.school;
  document.getElementById('pass-dest-name').textContent = pass.destination;
  document.getElementById('pass-id-display').textContent = '#' + pass.passId;
  document.getElementById('pass-issued').textContent = issued;
  document.getElementById('pass-limit').textContent = pass.duration + ' min';
  document.getElementById('pass-approved-by').textContent = pass.approvedBy || 'Teacher';
  document.getElementById('desktop-dest-name').textContent = pass.destination;
  document.getElementById('desktop-pass-id').textContent = '#' + pass.passId;
  document.getElementById('desktop-student-name').textContent = currentUser.name;
  document.getElementById('desktop-issued').textContent = issued;
  document.getElementById('desktop-limit').textContent = pass.duration + ' min';
  document.getElementById('desktop-approved').textContent = pass.approvedBy || 'Teacher';
  document.getElementById('pass-id-desktop').textContent = '#' + pass.passId;
  passTotal = pass.duration * 60;
  passRemaining = passTotal;
  clearInterval(passTimerInterval);
  passTimerInterval = setInterval(tickPass, 1000);
}
function tickPass() {
  if (passRemaining <= 0) {
    clearInterval(passTimerInterval);
    updatePassTimer(0);
    return;
  }
  passRemaining--;
  updatePassTimer(passRemaining);
}
function updatePassTimer(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  const timeStr = `${m}:${pad(s)}`;
  const pct = passTotal > 0 ? secs / passTotal : 0;
  const circumference = 264;
  const offset = circumference * (1 - pct);
  document.getElementById('pass-timer-num').textContent = timeStr;
  document.getElementById('pass-ring-pct').textContent = Math.round(pct * 100) + '%';
  document.getElementById('desktop-timer-num').textContent = timeStr;
  const ringColor = pct > 0.5 ? '#22c55e' : pct > 0.2 ? '#f59e0b' : '#ef4444';
  const mobileRing = document.getElementById('pass-ring-circle');
  if (mobileRing) { mobileRing.style.strokeDashoffset = offset; mobileRing.style.stroke = ringColor; }
  const desktopRing = document.getElementById('desktop-ring-circle');
  if (desktopRing) { desktopRing.style.strokeDashoffset = offset * 1.88; desktopRing.style.stroke = ringColor; }
  const destBox = document.getElementById('pass-dest-box');
  if (destBox) { if (pct <= 0.2) destBox.style.borderColor = '#ef4444'; else if (pct <= 0.5) destBox.style.borderColor = '#f59e0b'; else destBox.style.borderColor = '#22c55e'; }
}
function endPass() {
  clearInterval(passTimerInterval);
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === activePassId);
  if (pass) { pass.status = 'completed'; pass.used = true; ls('ss_hallpasses_' + currentUser.school, passes); }
  activePassId = null;
  nav('classroom');
}
function sendPassReply() {
  const text = document.getElementById('pass-reply-input').value.trim();
  if (!text) return;
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === activePassId);
  if (pass) { pass.studentReply = text; ls('ss_hallpasses_' + currentUser.school, passes); }
  alert('Reply sent to teacher!');
  document.getElementById('pass-reply-input').value = '';
}
function sendPassReplyDesktop() {
  const text = document.getElementById('desktop-reply-input').value.trim();
  if (!text) return;
  alert('Reply sent to teacher!');
  document.getElementById('desktop-reply-input').value = '';
}
function renderPassPanels() {
  if (!currentClass) return;
  const passes = lsArr('ss_hallpasses_' + currentUser.school).filter(p => p.classId === currentClass.id);
  const pending = passes.filter(p => p.status === 'pending');
  const active = passes.filter(p => p.status === 'active');
  const pEl = document.getElementById('pending-passes');
  if (pEl) pEl.innerHTML = pending.length ? pending.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}')">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}')">Deny</button></div></div>`).join('') : '<div class="empty-state">No pending requests</div>';
  const aEl = document.getElementById('active-passes');
  if (aEl) aEl.innerHTML = active.length ? active.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination}</div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Message</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}')">End</button><button class="btn-blue btn-sm" onclick="resumePass('${p.id}')">Resume</button></div></div>`).join('') : '<div class="empty-state">No active passes</div>';
  renderTPPanels();
}
function approvePass(id) {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === id);
  if (pass) { pass.status = 'active'; pass.approvedAt = Date.now(); pass.approvedBy = currentUser.name; ls('ss_hallpasses_' + currentUser.school, passes); }
  renderPassPanels();
}
function denyPass(id) {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === id);
  if (pass) { pass.status = 'denied'; pass.used = true; ls('ss_hallpasses_' + currentUser.school, passes); }
  renderPassPanels();
}
function endPassTeacher(id) {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === id);
  if (pass) { pass.status = 'completed'; pass.used = true; ls('ss_hallpasses_' + currentUser.school, passes); }
  renderPassPanels();
}
function resumePass(id) {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === id);
  if (pass) { pass.status = 'active'; ls('ss_hallpasses_' + currentUser.school, passes); }
  renderPassPanels(); alert('Pass resumed!');
}
function sendTeacherMsg(id) {
  const msg = prompt('Send message to student:');
  if (!msg) return;
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.id === id);
  if (pass) { pass.message = msg; ls('ss_hallpasses_' + currentUser.school, passes); }
  alert('Message sent!');
}
function verifyPass() {
  const input = document.getElementById('verify-pass-input').value.trim().replace('#','').toUpperCase();
  verifyPassById(input, 'verify-result');
}
function verifyPassTeacher() {
  const input = document.getElementById('tp-verify-input').value.trim().replace('#','').toUpperCase();
  verifyPassById(input, 'tp-verify-result');
}
function verifyPassById(passId, resultElId) {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pass = passes.find(p => p.passId === passId);
  const el = document.getElementById(resultElId);
  if (!pass) { el.innerHTML = `<div class="verify-invalid">❌ INVALID — Pass ID #${passId} does not exist or was never issued.</div>`; return; }
  if (pass.status === 'active') { el.innerHTML = `<div class="verify-valid">✅ VALID — Pass #${passId} is currently active.<br><strong>Student:</strong> ${pass.studentName}<br><strong>Destination:</strong> ${pass.destination}<br><strong>Issued:</strong> ${new Date(pass.approvedAt).toLocaleTimeString()}<br><strong>Duration:</strong> ${pass.duration} min</div>`; }
  else if (pass.status === 'completed' || pass.used) { el.innerHTML = `<div class="verify-expired">⚠️ EXPIRED — Pass #${passId} has already been used and is no longer valid.</div>`; }
  else if (pass.status === 'pending') { el.innerHTML = `<div class="verify-expired">⏳ PENDING — Pass #${passId} is awaiting teacher approval.</div>`; }
  else if (pass.status === 'denied') { el.innerHTML = `<div class="verify-invalid">❌ DENIED — Pass #${passId} was denied by the teacher.</div>`; }
}
function renderTPPanels() {
  const passes = lsArr('ss_hallpasses_' + currentUser.school);
  const pending = passes.filter(p => p.status === 'pending');
  const active = passes.filter(p => p.status === 'active');
  const pEl = document.getElementById('tp-pending');
  if (pEl) pEl.innerHTML = pending.length ? pending.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}');renderTPPanels()">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}');renderTPPanels()">Deny</button></div></div>`).join('') : '<div class="empty-state">No pending requests</div>';
  const aEl = document.getElementById('tp-active');
  if (aEl) aEl.innerHTML = active.length ? active.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination}<br><span style="font-size:11px;color:var(--gray)">#${p.passId}</span></div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}');renderTPPanels()">End</button><button class="btn-blue btn-sm" onclick="resumePass('${p.id}')">Resume</button></div></div>`).join('') : '<div class="empty-state">No active passes</div>';
}

// ---- CLUBS ----
function renderClubs() {
  const clubs = lsArr('ss_clubs_' + currentUser.school);
  const el = document.getElementById('clubs-list');
  el.innerHTML = clubs.length ? clubs.map(c => `<div class="club-card" onclick="openClub('${c.id}')"><div class="club-emoji">${c.emoji}</div><div class="club-name">${c.name}</div><div class="club-desc">${c.description}</div><div class="club-role-badge">${c.president === currentUser.id ? 'President' : c.members.includes(currentUser.id) ? 'Member' : 'Not joined'}</div></div>`).join('') : '<div class="empty-state">No clubs yet</div>';
}
function createClub() {
  if (!currentUser.isAdmin) return;
  const name = document.getElementById('club-name').value.trim();
  const description = document.getElementById('club-desc').value.trim();
  const emoji = document.getElementById('club-emoji').value || '🎯';
  if (!name) return;
  const clubs = lsArr('ss_clubs_' + currentUser.school);
  clubs.push({ id: genId(), name, description, emoji, president: currentUser.id, members: [currentUser.id], officers: {}, school: currentUser.school, createdAt: Date.now() });
  ls('ss_clubs_' + currentUser.school, clubs);
  renderClubs(); closeAllModals();
  ['club-name','club-desc','club-emoji'].forEach(id => document.getElementById(id).value = '');
}
function openClub(id) { alert('Club portal coming soon with full chat, announcements, and sign-up sheets!'); }

// ---- SPORTS ----
function renderSports() {
  const items = lsArr('ss_sports_' + currentUser.school).sort((a,b) => new Date(b.date) - new Date(a.date));
  const el = document.getElementById('sports-list');
  el.innerHTML = items.length ? items.map(s => {
    const result = parseInt(s.ourScore) > parseInt(s.theirScore) ? 'WIN' : parseInt(s.ourScore) < parseInt(s.theirScore) ? 'LOSS' : 'TIE';
    const cls = result === 'WIN' ? 'wlt-win' : result === 'LOSS' ? 'wlt-loss' : 'wlt-tie';
    return `<div class="sport-card"><div class="sport-header"><span class="sport-tag">${s.sport}</span><span class="wlt-badge ${cls}">${result}</span></div><div class="score-row"><div class="score-team"><div class="score-team-name">Panthers</div><div class="score-num">${s.ourScore}</div></div><div class="score-vs">VS</div><div class="score-team"><div class="score-team-name">${s.opponent}</div><div class="score-num">${s.theirScore}</div></div></div><div style="font-size:12px;color:var(--gray);margin-top:10px;">${s.date}</div>${currentUser.isAdmin?`<button class="btn-ghost btn-sm" style="margin-top:8px;" onclick="deleteSport('${s.id}')">Delete</button>`:''}</div>`;
  }).join('') : '<div class="empty-state">No game results yet</div>';
}
function addSportResult() {
  const sport = document.getElementById('sport-type').value;
  const opponent = document.getElementById('sport-opp').value.trim();
  const ourScore = document.getElementById('sport-us').value;
  const theirScore = document.getElementById('sport-them').value;
  const date = document.getElementById('sport-date').value;
  if (!opponent || !ourScore || !theirScore || !date) return;
  const items = lsArr('ss_sports_' + currentUser.school);
  items.push({ id: genId(), sport, opponent, ourScore, theirScore, date, school: currentUser.school, postedBy: currentUser.id });
  ls('ss_sports_' + currentUser.school, items);
  renderSports(); closeAllModals();
  ['sport-opp','sport-us','sport-them','sport-date'].forEach(id => document.getElementById(id).value = '');
}
function deleteSport(id) { ls('ss_sports_' + currentUser.school, lsArr('ss_sports_' + currentUser.school).filter(s => s.id !== id)); renderSports(); }

// ---- POLLS ----
function renderPolls() {
  const items = lsArr('ss_polls_' + currentUser.school).sort((a,b) => b.createdAt - a.createdAt);
  const el = document.getElementById('polls-list');
  el.innerHTML = items.length ? items.map(p => {
    const totalVotes = Object.values(p.votes || {}).length;
    const optHTML = p.options.map((opt, i) => {
      const count = Object.values(p.votes || {}).filter(v => v === i).length;
      const pct = totalVotes ? Math.round(count / totalVotes * 100) : 0;
      const voted = (p.votes || {})[currentUser.id] !== undefined;
      return `<div class="poll-opt" onclick="${!voted?`castVote('${p.id}',${i})`:''}"><div class="poll-opt-label"><span>${opt}</span><span>${pct}%</span></div><div class="poll-bar"><div class="poll-fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    return `<div class="poll-card"><div class="poll-q">${p.question}</div>${optHTML}<div style="font-size:12px;color:var(--gray);margin-top:8px;">${totalVotes} votes${currentUser.isAdmin?` • <button class="btn-ghost btn-sm" onclick="deletePoll('${p.id}')">Delete</button>`:''}</div></div>`;
  }).join('') : '<div class="empty-state">No polls yet</div>';
}
function createPoll() {
  if (!currentUser.isAdmin) return;
  const q = document.getElementById('poll-q').value.trim();
  const opts = ['poll-o1','poll-o2','poll-o3','poll-o4'].map(id => document.getElementById(id).value.trim()).filter(Boolean);
  if (!q || opts.length < 2) return;
  const items = lsArr('ss_polls_' + currentUser.school);
  items.push({ id: genId(), question: q, options: opts, votes: {}, school: currentUser.school, createdAt: Date.now(), postedBy: currentUser.id });
  ls('ss_polls_' + currentUser.school, items);
  renderPolls(); closeAllModals();
  ['poll-q','poll-o1','poll-o2','poll-o3','poll-o4'].forEach(id => document.getElementById(id).value = '');
}
function castVote(pollId, optIdx) {
  const items = lsArr('ss_polls_' + currentUser.school);
  const poll = items.find(p => p.id === pollId);
  if (!poll || poll.votes[currentUser.id] !== undefined) return;
  poll.votes[currentUser.id] = optIdx;
  ls('ss_polls_' + currentUser.school, items);
  renderPolls();
}
function deletePoll(id) { ls('ss_polls_' + currentUser.school, lsArr('ss_polls_' + currentUser.school).filter(p => p.id !== id)); renderPolls(); }

// ---- DIRECTORY ----
function renderDirectory() {
  const users = lsArr('ss_users').filter(u => u.school === currentUser.school && u.id !== currentUser.id);
  displayDir(users);
}
function displayDir(users) {
  const el = document.getElementById('dir-list');
  el.innerHTML = users.length ? users.map(u => `<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div><div style="flex:1"><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div><span class="role-badge ${u.isAdmin?'role-admin':u.role==='teacher'?'role-teacher':'role-student'}">${u.isAdmin?'Admin':u.role}</span></div>`).join('') : '<div class="empty-state">No other students found</div>';
}
function filterDir() {
  const q = document.getElementById('dir-search').value.toLowerCase();
  const users = lsArr('ss_users').filter(u => u.school === currentUser.school && u.id !== currentUser.id && u.name.toLowerCase().includes(q));
  displayDir(users);
}

// ---- LOST & FOUND ----
function renderLostFound() {
  const items = lsArr('ss_lostfound_' + currentUser.school).sort((a,b) => b.createdAt - a.createdAt);
  const el = document.getElementById('lf-list');
  el.innerHTML = items.length ? items.map(i => `<div class="lf-card"><div class="lf-status-badge ${i.status==='Lost'?'lf-lost':'lf-found'}">${i.status.toUpperCase()}</div><div style="flex:1"><div class="lf-name">${i.name}</div><div class="lf-loc">${i.location} • ${i.postedByName} • ${new Date(i.createdAt).toLocaleDateString()}</div></div>${i.postedBy===currentUser.id||currentUser.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteLF('${i.id}')">×</button>`:''}</div>`).join('') : '<div class="empty-state">No items posted</div>';
}
function addLF() {
  const name = document.getElementById('lf-item').value.trim();
  const location = document.getElementById('lf-loc').value.trim();
  const status = document.getElementById('lf-status').value;
  if (!name) return;
  const items = lsArr('ss_lostfound_' + currentUser.school);
  items.push({ id: genId(), name, location, status, postedBy: currentUser.id, postedByName: currentUser.name, school: currentUser.school, createdAt: Date.now() });
  ls('ss_lostfound_' + currentUser.school, items);
  renderLostFound(); closeAllModals();
  ['lf-item','lf-loc'].forEach(id => document.getElementById(id).value = '');
}
function deleteLF(id) { ls('ss_lostfound_' + currentUser.school, lsArr('ss_lostfound_' + currentUser.school).filter(i => i.id !== id)); renderLostFound(); }

// ---- CARPOOL ----
function renderCarpool() {
  const items = lsArr('ss_carpool_' + currentUser.school).sort((a,b) => b.createdAt - a.createdAt);
  const el = document.getElementById('cp-list');
  el.innerHTML = items.length ? items.map(i => `<div class="cp-card"><div class="cp-icon">${parseInt(i.seats)>0?'🚗':'🙋'}</div><div style="flex:1"><div class="cp-area">${i.area}</div><div class="cp-info">${i.contact}</div></div><div class="cp-seats-badge">${parseInt(i.seats)>0?i.seats+' seats':'Looking'}</div>${i.postedBy===currentUser.id?`<button class="btn-ghost btn-sm" onclick="deleteCP('${i.id}')">×</button>`:''}</div>`).join('') : '<div class="empty-state">No carpool posts yet</div>';
}
function addCarpool() {
  const area = document.getElementById('cp-area').value.trim();
  const seats = document.getElementById('cp-seats').value;
  const contact = document.getElementById('cp-contact').value.trim();
  if (!area || !contact) return;
  const items = lsArr('ss_carpool_' + currentUser.school);
  items.push({ id: genId(), area, seats: seats || '0', contact, postedBy: currentUser.id, school: currentUser.school, createdAt: Date.now() });
  ls('ss_carpool_' + currentUser.school, items);
  renderCarpool(); closeAllModals();
  ['cp-area','cp-seats','cp-contact'].forEach(id => document.getElementById(id).value = '');
}
function deleteCP(id) { ls('ss_carpool_' + currentUser.school, lsArr('ss_carpool_' + currentUser.school).filter(i => i.id !== id)); renderCarpool(); }

// ---- GROUP CHATS ----
function renderChats() {
  const chats = lsArr('ss_chats_' + currentUser.school).filter(c => c.members.includes(currentUser.email));
  const el = document.getElementById('chat-list');
  el.innerHTML = chats.length ? chats.map(c => {
    const daysLeft = Math.max(0, 14 - Math.floor((Date.now() - c.createdAt) / 86400000));
    return `<div class="chat-item" onclick="openChat('${c.id}')"><div class="chat-item-name">${c.name}</div><div class="chat-item-preview">${c.lastMessage || 'No messages yet'}</div><div class="chat-item-meta"><span></span><span class="chat-expires-badge">${daysLeft}d left</span></div></div>`;
  }).join('') : '<div class="empty-state">No chats yet</div>';
}
function createChat() {
  const name = document.getElementById('new-chat-name').value.trim();
  if (!name) return;
  const members = [currentUser.email, ...chatMembers];
  const chats = lsArr('ss_chats_' + currentUser.school);
  chats.push({ id: genId(), name, members, school: currentUser.school, createdAt: Date.now(), lastMessage: null, messages: [] });
  ls('ss_chats_' + currentUser.school, chats);
  chatMembers = [];
  document.getElementById('chat-members-list').innerHTML = '';
  renderChats(); closeAllModals();
  document.getElementById('new-chat-name').value = '';
}
function addChatMember() {
  const email = document.getElementById('chat-member-email').value.trim();
  if (!email) return;
  const users = lsArr('ss_users');
  const user = users.find(u => u.email === email && u.school === currentUser.school);
  if (!user) return alert('No user found with that email at your school.');
  if (chatMembers.includes(email)) return alert('Already added!');
  chatMembers.push(email);
  const list = document.getElementById('chat-members-list');
  list.innerHTML += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);"><div class="dir-avatar" style="background:${user.avatar};width:28px;height:28px;font-size:11px;">${user.name[0]}</div>${user.name} <span style="color:var(--gray)">(${email})</span></div>`;
  document.getElementById('chat-member-email').value = '';
}
function openChat(id) {
  currentChat = id;
  const chats = lsArr('ss_chats_' + currentUser.school);
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  const chatPanel = document.getElementById('chat-main-panel');
  chatPanel.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:15px;font-weight:600;">${chat.name}</div><div class="chat-messages" id="chat-messages">${renderChatMessages(chat.messages)}</div><div class="chat-input-area"><input class="chat-input" placeholder="Message..." id="chat-input" onkeydown="if(event.key==='Enter')sendChatMsg()"><button class="chat-send" onclick="sendChatMsg()">➤</button></div>`;
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
function renderChatMessages(messages) {
  if (!messages || !messages.length) return '<div class="empty-state">No messages yet. Say something!</div>';
  return messages.map(m => `<div class="chat-msg ${m.uid === currentUser.id ? 'me' : 'other'}">${m.uid !== currentUser.id ? `<div class="chat-msg-sender">${m.name}</div>` : ''}<div class="chat-msg-bubble">${m.text}</div></div>`).join('');
}
function sendChatMsg() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const chats = lsArr('ss_chats_' + currentUser.school);
  const chat = chats.find(c => c.id === currentChat);
  if (!chat) return;
  const msg = { id: genId(), text, uid: currentUser.id, name: currentUser.name, sentAt: Date.now() };
  if (!chat.messages) chat.messages = [];
  chat.messages.push(msg);
  chat.lastMessage = text;
  ls('ss_chats_' + currentUser.school, chats);
  input.value = '';
  openChat(currentChat);
}

// ---- STUDY GROUPS ----
function renderStudyGroups() {
  const items = lsArr('ss_studygroups_' + currentUser.school).sort((a,b) => new Date(a.time) - new Date(b.time));
  const el = document.getElementById('sg-list');
  el.innerHTML = items.length ? items.map(s => {
    const full = s.members.length >= s.spots;
    return `<div class="sg-card"><div class="sg-info"><div class="sg-subject">${s.subject}</div><div class="sg-details">📍 ${s.location} • ${s.time ? new Date(s.time).toLocaleString() : 'TBD'}</div><div class="sg-details">${s.members.length}/${s.spots} spots</div></div><span class="sg-spots-badge ${full?'sg-full':'sg-open'}">${full?'FULL':'OPEN'}</span>${!full&&!s.members.includes(currentUser.id)?`<button class="btn-blue btn-sm" onclick="joinStudyGroup('${s.id}')">Join</button>`:''}${s.postedBy===currentUser.id?`<button class="btn-ghost btn-sm" onclick="deleteSG('${s.id}')">×</button>`:''}</div>`;
  }).join('') : '<div class="empty-state">No study groups yet</div>';
}
function addStudyGroup() {
  const subject = document.getElementById('sg-subj').value.trim();
  const location = document.getElementById('sg-loc').value.trim();
  const time = document.getElementById('sg-time').value;
  const spots = parseInt(document.getElementById('sg-spots').value) || 5;
  if (!subject) return;
  const items = lsArr('ss_studygroups_' + currentUser.school);
  items.push({ id: genId(), subject, location, time, spots, members: [currentUser.id], postedBy: currentUser.id, school: currentUser.school, createdAt: Date.now() });
  ls('ss_studygroups_' + currentUser.school, items);
  renderStudyGroups(); closeAllModals();
}
function joinStudyGroup(id) {
  const items = lsArr('ss_studygroups_' + currentUser.school);
  const sg = items.find(s => s.id === id);
  if (sg && !sg.members.includes(currentUser.id)) { sg.members.push(currentUser.id); ls('ss_studygroups_' + currentUser.school, items); renderStudyGroups(); }
}
function deleteSG(id) { ls('ss_studygroups_' + currentUser.school, lsArr('ss_studygroups_' + currentUser.school).filter(s => s.id !== id)); renderStudyGroups(); }

// ---- REMINDERS ----
function renderReminders() {
  const items = lsArr('ss_reminders_' + currentUser.id).sort((a,b) => new Date(a.date) - new Date(b.date));
  const el = document.getElementById('rem-list');
  el.innerHTML = items.length ? items.map(r => {
    const days = r.date ? Math.ceil((new Date(r.date) - new Date()) / 86400000) : null;
    const cls = days === null ? 'var(--gray)' : days <= 0 ? 'var(--red)' : days === 1 ? 'var(--gold)' : 'var(--blue-light)';
    const label = days === null ? '—' : days <= 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : days;
    return `<div class="rem-card"><div class="rem-days" style="color:${cls}">${label}</div><div style="flex:1"><div class="rem-text">${r.text}</div>${r.date?`<div class="rem-date">${r.date}</div>`:''}</div><button class="btn-ghost btn-sm" onclick="deleteReminder('${r.id}')">×</button></div>`;
  }).join('') : '<div class="empty-state">No reminders yet</div>';
}
function addReminder() {
  const text = document.getElementById('rem-text').value.trim();
  const date = document.getElementById('rem-date').value;
  if (!text) return;
  const items = lsArr('ss_reminders_' + currentUser.id);
  items.push({ id: genId(), text, date });
  ls('ss_reminders_' + currentUser.id, items);
  renderReminders(); closeAllModals();
  document.getElementById('rem-text').value = ''; document.getElementById('rem-date').value = '';
}
function deleteReminder(id) { ls('ss_reminders_' + currentUser.id, lsArr('ss_reminders_' + currentUser.id).filter(r => r.id !== id)); renderReminders(); }

// ---- PROFILE ----
function renderProfile() {
  const av = document.getElementById('profile-avatar-big');
  av.textContent = currentUser.name[0].toUpperCase();
  av.style.background = currentUser.avatar;
  document.getElementById('profile-name-input').value = currentUser.name;
}
function selectAvatar(el, gradient) {
  document.querySelectorAll('.avatar-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('profile-avatar-big').style.background = gradient;
  const users = lsArr('ss_users');
  const user = users.find(u => u.id === currentUser.id);
  if (user) { user.avatar = gradient; ls('ss_users', users); currentUser.avatar = gradient; ls('ss_currentUser', currentUser); }
  document.getElementById('sidebar-avatar').style.background = gradient;
}
function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  if (!name) return;
  const users = lsArr('ss_users');
  const user = users.find(u => u.id === currentUser.id);
  if (user) { user.name = name; ls('ss_users', users); currentUser.name = name; ls('ss_currentUser', currentUser); }
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('profile-avatar-big').textContent = name[0].toUpperCase();
  document.getElementById('sidebar-avatar').textContent = name[0].toUpperCase();
  alert('Profile saved!');
}

// ---- ADMIN ----
function approveTeacher() {
  const email = document.getElementById('teacher-email-input').value.trim();
  if (!email) return;
  const teachers = lsArr('ss_approvedTeachers_' + currentUser.school);
  if (teachers.find(t => t.email === email)) return alert('Already approved!');
  teachers.push({ email, addedBy: currentUser.id, addedAt: Date.now() });
  ls('ss_approvedTeachers_' + currentUser.school, teachers);
  const users = lsArr('ss_users');
  const teacher = users.find(u => u.email === email && u.school === currentUser.school);
  if (teacher) { teacher.approved = true; ls('ss_users', users); }
  renderApprovedTeachers();
  document.getElementById('teacher-email-input').value = '';
  alert('Teacher approved!');
}
function bulkApproveTeachers() {
  const emails = document.getElementById('bulk-teachers').value.split('\n').map(e => e.trim()).filter(Boolean);
  emails.forEach(email => {
    const teachers = lsArr('ss_approvedTeachers_' + currentUser.school);
    if (!teachers.find(t => t.email === email)) {
      teachers.push({ email, addedBy: currentUser.id, addedAt: Date.now() });
      ls('ss_approvedTeachers_' + currentUser.school, teachers);
    }
  });
  renderApprovedTeachers();
  document.getElementById('bulk-teachers').value = '';
  alert(`${emails.length} teachers approved!`);
}
function renderApprovedTeachers() {
  const teachers = lsArr('ss_approvedTeachers_' + currentUser.school);
  const el = document.getElementById('approved-teachers-list');
  if (!el) return;
  el.innerHTML = teachers.map(t => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${t.email}</span><button class="btn-ghost btn-sm" onclick="removeTeacher('${t.email}')">Remove</button></div>`).join('');
}
function removeTeacher(email) {
  ls('ss_approvedTeachers_' + currentUser.school, lsArr('ss_approvedTeachers_' + currentUser.school).filter(t => t.email !== email));
  renderApprovedTeachers();
}

// ---- MODALS ----
function openModal(id) {
  document.querySelector('.modal-overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}
function closeAllModals() {
  document.querySelector('.modal-overlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  const saved = ls('ss_currentUser');
  if (saved) {
    const users = lsArr('ss_users');
    const fresh = users.find(u => u.id === saved.id);
    if (fresh) { currentUser = fresh; launchApp(); return; }
  }
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
});
