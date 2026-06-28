// ============================================================
// SCHOLARSYNC — app.js (Firebase Edition)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOMVE_pPbe7JIMwLcjgHMriMlT9wEuU-o",
  authDomain: "scholarsync-da2fd.firebaseapp.com",
  projectId: "scholarsync-da2fd",
  storageBucket: "scholarsync-da2fd.firebasestorage.app",
  messagingSenderId: "700534317822",
  appId: "1:700534317822:web:1ad5cc8b20c82b1f2c7baf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---- ICONS ----
const ICONS = {
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><polyline points="20,6 9,17 4,12"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  hand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M6 14c0 0-1.5-1-1.5-3.5A2.5 2.5 0 017 8.5V10"/><path d="M6 14c0 4 3 6 6 6s6-2 6-6v-4"/></svg>`,
  msg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
};

// ---- STATE ----
let currentUser = null;
let currentUserData = null;
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
let unsubscribers = [];

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

// ---- HELPERS ----
function ls(key, val) {
  if (val === undefined) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  localStorage.setItem(key, JSON.stringify(val));
}
function lsArr(key) { return ls(key) || []; }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function genPassId() { return 'HP' + Math.floor(100000 + Math.random() * 900000); }
function pad(n) { return String(n).padStart(2, '0'); }

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

async function signIn() {
  const email = document.getElementById('si-email').value.trim();
  const pass = document.getElementById('si-password').value;
  if (!email || !pass) return showAuthError('Please fill in all fields.');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    const msgs = { 'auth/user-not-found': 'No account found with this email.', 'auth/wrong-password': 'Wrong password. Try again.', 'auth/invalid-credential': 'Invalid email or password.', 'auth/too-many-requests': 'Too many attempts. Try again later.' };
    showAuthError(msgs[e.code] || 'Sign in failed. Try again.');
  }
}

async function signUp() {
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-password').value;
  const school = document.getElementById('su-school').value;
  const grade = document.getElementById('su-grade').value;
  if (!name || !email || !pass || !school || !grade) return showAuthError('Please fill in all fields.');
  if (pass.length < 6) return showAuthError('Password must be at least 6 characters.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    const isFounder = email === 'mykahsheppard@g.horrycountyschools.net';
    // check if first user at school
    const schoolSnap = await getDocs(query(collection(db, 'users'), where('school', '==', school)));
    const isFirstFromSchool = schoolSnap.empty;
    // check if pre-granted
    const grantedTeachersSnap = await getDoc(doc(db, 'schoolRoles', school));
    const grantedData = grantedTeachersSnap.exists() ? grantedTeachersSnap.data() : {};
    const grantedTeachers = grantedData.teachers || [];
    const grantedAdmins = grantedData.admins || [];
    const isGrantedTeacher = grantedTeachers.includes(email.toLowerCase());
    const isGrantedAdmin = grantedAdmins.includes(email.toLowerCase());
    const isAdmin = isFirstFromSchool || isFounder || isGrantedAdmin;
    const isTeacher = isAdmin || isGrantedTeacher;
    const userData = { uid, name, email, school, grade, role: isTeacher ? 'teacher' : 'student', isAdmin, isTeacher, avatar: 'linear-gradient(135deg,#1a56db,#3b82f6)', createdAt: serverTimestamp() };
    await setDoc(doc(db, 'users', uid), userData);
    // if founder, set up school roles doc
    if (isFirstFromSchool || isFounder) {
      await setDoc(doc(db, 'schoolRoles', school), { admins: [email.toLowerCase()], teachers: [] }, { merge: true });
    }
  } catch (e) {
    const msgs = { 'auth/email-already-in-use': 'An account with this email already exists.', 'auth/weak-password': 'Password must be at least 6 characters.', 'auth/invalid-email': 'Invalid email address.' };
    showAuthError(msgs[e.code] || 'Sign up failed. Try again.');
  }
}

async function signOut() {
  unsubscribers.forEach(u => u());
  unsubscribers = [];
  await fbSignOut(auth);
  currentUser = null;
  currentUserData = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

async function showForgot() {
  const email = prompt('Enter your email to reset your password:');
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Check your inbox.');
  } catch { alert('Could not send reset email. Check the address and try again.'); }
}

// ---- FIREBASE AUTH LISTENER ----
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      currentUserData = snap.data();
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = '';
      launchApp();
    }
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
});

// ---- LAUNCH ----
function launchApp() {
  const u = currentUserData;
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
  const u = currentUserData;
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
  av.style.background = u.avatar || 'linear-gradient(135deg,#1a56db,#3b82f6)';
  if (u.isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    document.getElementById('admin-panel').style.display = '';
  }
  if (u.isTeacher || u.isAdmin) {
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = '');
    document.getElementById('teacher-panel-btn').style.display = '';
  }
  const savedTheme = ls('ss_theme');
  if (savedTheme === 'light') { document.body.classList.add('light-mode'); document.getElementById('theme-label').textContent = 'Dark Mode'; }
  renderApprovedTeachers();
  renderApprovedAdmins();
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

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('open');
}
function toggleTheme() {
  const light = document.body.classList.toggle('light-mode');
  document.getElementById('theme-label').textContent = light ? 'Dark Mode' : 'Light Mode';
  ls('ss_theme', light ? 'light' : 'dark');
}

// ---- CLOCK ----
function startClock() { updateClock(); setInterval(updateClock, 1000); }
function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  document.getElementById('clock').textContent = `${hh}:${pad(m)}:${pad(s)} ${ampm}`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('clock-date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  updatePeriod(h, m);
}
function updatePeriod(h, m) {
  const totalMins = h * 60 + m;
  let cur = null;
  for (const p of PERIODS) {
    const start = p.start[0] * 60 + p.start[1];
    const end = p.end[0] * 60 + p.end[1];
    if (totalMins >= start && totalMins < end) { cur = { ...p, start, end }; break; }
  }
  ['period-name','sched-period'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = cur ? cur.name : 'No class'; });
  if (cur) {
    const left = cur.end - totalMins;
    const pct = ((totalMins - cur.start) / (cur.end - cur.start) * 100).toFixed(1);
    const timeStr = `${Math.floor(left / 60)}:${pad(left % 60)}`;
    ['period-time','sched-time'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = timeStr; });
    ['period-progress','sched-progress'].forEach(id => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; });
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
function tempSavePeriod(i, val) { const saved = ls('ss_schedule') || {}; saved['period' + i] = val; ls('ss_schedule', saved); populateClassDropdowns(); }
function saveSchedule() { alert('Schedule saved!'); populateClassDropdowns(); }
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
  document.getElementById('id-name').textContent = currentUserData.name;
  document.getElementById('id-school-label').textContent = currentUserData.school;
  document.getElementById('id-grade-display').textContent = idData.grade || currentUserData.grade || '—';
  document.getElementById('id-num-display').textContent = idData.idNumber || '—';
  document.getElementById('id-grade-input').value = idData.grade || '';
  document.getElementById('id-num-input').value = idData.idNumber || '';
  const av = document.getElementById('id-avatar');
  av.textContent = currentUserData.name[0].toUpperCase();
  av.style.background = currentUserData.avatar;
  const bc = document.getElementById('id-barcode');
  bc.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('span');
    s.style.cssText = `width:${[1,1,2,2,1,3][Math.floor(Math.random()*6)]}px;height:${16+Math.random()*16}px;display:inline-block;`;
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
    const SVG = {
      sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`,
      cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
      rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/></svg>`,
      snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5 5-5-5M17 17l-5-5-5 5"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
      storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9"/><polyline points="13,11 9,17 15,17 11,23"/></svg>`,
      pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    };
    let cond = `${SVG.sun} Clear`;
    if (code >= 1 && code <= 3) cond = `${SVG.cloud} Partly Cloudy`;
    if (code >= 51 && code <= 67) cond = `${SVG.rain} Rain`;
    if (code >= 71 && code <= 77) cond = `${SVG.snow} Snow`;
    if (code >= 80 && code <= 82) cond = `${SVG.rain} Showers`;
    if (code >= 95) cond = `${SVG.storm} Thunderstorm`;
    card.innerHTML = `<div style="display:flex;align-items:flex-start;gap:20px;"><div><div class="weather-big-temp">${tempF}°F</div><div class="weather-condition">${cond}</div><div style="font-size:13px;color:var(--gray)">${SVG.pin} Myrtle Beach, SC</div></div></div><div class="weather-details-grid"><div class="weather-detail-card"><div class="weather-detail-val">${feelsF}°</div><div class="weather-detail-label">Feels Like</div></div><div class="weather-detail-card"><div class="weather-detail-val">${humidity}%</div><div class="weather-detail-label">Humidity</div></div><div class="weather-detail-card"><div class="weather-detail-val">${wind}</div><div class="weather-detail-label">Wind mph</div></div></div>`;
  } catch { card.innerHTML = '<div class="weather-loading">Could not load weather.</div>'; }
}

// ---- HOMEWORK (localStorage — personal) ----
function renderHomework() {
  const uid = currentUser.uid;
  const items = lsArr('ss_homework_' + uid);
  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  document.getElementById('hw-pending').innerHTML = pending.length ? pending.map(hwHTML).join('') : '<div class="empty-state">No pending tasks 🎉</div>';
  document.getElementById('hw-done').innerHTML = done.length ? done.map(hwHTML).join('') : '<div class="empty-state">Nothing completed yet</div>';
  const todayHW = document.getElementById('today-hw-list');
  if (todayHW) todayHW.innerHTML = pending.length ? pending.slice(0,3).map(i => `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div></div>`).join('') : '<div class="empty-state">No homework due today 🎉</div>';
}
function hwHTML(i) { return `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div style="flex:1"><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div><button class="btn-ghost btn-sm" onclick="deleteHW('${i.id}')">×</button></div>`; }
function addHW() {
  const text = document.getElementById('hw-task-name').value.trim();
  const cls = document.getElementById('hw-task-class').value;
  if (!text) return;
  const items = lsArr('ss_homework_' + currentUser.uid);
  items.unshift({ id: genId(), text, cls, done: false, date: new Date().toISOString().split('T')[0] });
  ls('ss_homework_' + currentUser.uid, items);
  renderHomework(); closeAllModals();
  document.getElementById('hw-task-name').value = '';
}
function toggleHW(id) {
  const items = lsArr('ss_homework_' + currentUser.uid);
  const item = items.find(i => i.id === id);
  if (item) item.done = !item.done;
  ls('ss_homework_' + currentUser.uid, items);
  renderHomework();
}
function deleteHW(id) { ls('ss_homework_' + currentUser.uid, lsArr('ss_homework_' + currentUser.uid).filter(i => i.id !== id)); renderHomework(); }

// ---- NOTES ----
function saveNote() {
  const cls = document.getElementById('notes-class-select').value;
  const text = document.getElementById('notes-editor').value.trim();
  if (!cls || !text) return alert('Select a class and write some notes first!');
  const notes = lsArr('ss_notes_' + currentUser.uid);
  const existing = notes.find(n => n.cls === cls);
  if (existing) existing.text = text; else notes.push({ id: genId(), cls, text });
  ls('ss_notes_' + currentUser.uid, notes);
  renderNotesList(); alert('Note saved!');
}
function renderNotesList() {
  const notes = lsArr('ss_notes_' + currentUser.uid);
  document.getElementById('notes-list').innerHTML = notes.length ? notes.map(n => `<div class="note-item" onclick="loadNoteItem('${n.id}')"><div class="note-item-class">${n.cls}</div>${n.text.slice(0,60)}...</div>`).join('') : '<div class="empty-state">No notes saved</div>';
}
function loadNote() { const cls = document.getElementById('notes-class-select').value; const notes = lsArr('ss_notes_' + currentUser.uid); const found = notes.find(n => n.cls === cls); document.getElementById('notes-editor').value = found ? found.text : ''; }
function loadNoteItem(id) { const notes = lsArr('ss_notes_' + currentUser.uid); const note = notes.find(n => n.id === id); if (note) { document.getElementById('notes-class-select').value = note.cls; document.getElementById('notes-editor').value = note.text; } }

// ---- DEADLINES ----
function renderDeadlines() {
  const items = lsArr('ss_deadlines_' + currentUser.uid).sort((a,b) => new Date(a.date) - new Date(b.date));
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
  const items = lsArr('ss_deadlines_' + currentUser.uid);
  items.push({ id: genId(), name, cls, type, date });
  ls('ss_deadlines_' + currentUser.uid, items);
  renderDeadlines(); closeAllModals();
  document.getElementById('dl-name').value = ''; document.getElementById('dl-date').value = '';
}
function deleteDeadline(id) { ls('ss_deadlines_' + currentUser.uid, lsArr('ss_deadlines_' + currentUser.uid).filter(i => i.id !== id)); renderDeadlines(); }
function renderDashDeadlines() {
  const items = lsArr('ss_deadlines_' + currentUser.uid).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0,5);
  const el = document.getElementById('dash-deadlines');
  if (!el) return;
  el.innerHTML = items.length ? items.map(dl => { const days = Math.ceil((new Date(dl.date) - new Date()) / 86400000); const cls = days <= 3 ? 'dl-red' : days <= 7 ? 'dl-gold' : 'dl-blue'; return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${dl.name}</span><span class="${cls}" style="font-weight:700">${days <= 0 ? 'TODAY' : days + 'd'}</span></div>`; }).join('') : '<div class="empty-state">No upcoming deadlines</div>';
  document.getElementById('stat-due').textContent = items.filter(d => Math.ceil((new Date(d.date) - new Date()) / 86400000) <= 7 && Math.ceil((new Date(d.date) - new Date()) / 86400000) >= 0).length;
}

// ---- EXAMS ----
function renderExams() {
  const items = lsArr('ss_exams_' + currentUser.uid).sort((a,b) => new Date(a.date) - new Date(b.date));
  const el = document.getElementById('exam-list');
  el.innerHTML = items.length ? items.map(ex => { const days = Math.ceil((new Date(ex.date) - new Date()) / 86400000); const cls = days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#3b82f6'; return `<div class="exam-card"><div class="exam-days" style="color:${cls}">${days === 0 ? 'TODAY!' : days < 0 ? 'PAST' : days}</div><div style="font-size:11px;color:var(--gray);">${days > 0 ? 'DAYS LEFT' : ''}</div><div class="exam-name">${ex.name}</div><div class="exam-subject">${ex.subject}</div><div class="exam-date">${ex.date}</div><button class="btn-ghost btn-sm" style="margin-top:10px;width:100%;" onclick="deleteExam('${ex.id}')">Delete</button></div>`; }).join('') : '<div class="empty-state">No exams added yet</div>';
}
function addExam() {
  const name = document.getElementById('exam-name').value.trim();
  const subject = document.getElementById('exam-subject').value.trim();
  const date = document.getElementById('exam-date').value;
  if (!name || !date) return;
  const items = lsArr('ss_exams_' + currentUser.uid);
  items.push({ id: genId(), name, subject, date });
  ls('ss_exams_' + currentUser.uid, items);
  renderExams(); closeAllModals();
}
function deleteExam(id) { ls('ss_exams_' + currentUser.uid, lsArr('ss_exams_' + currentUser.uid).filter(i => i.id !== id)); renderExams(); }

// ---- STUDY TIMER ----
function setTimerMode(mins, label, el) { document.querySelectorAll('.timer-mode-row .btn-ghost').forEach(b => b.classList.remove('active-mode')); el.classList.add('active-mode'); timerMode = mins; timerSecs = mins * 60; timerRunning = false; clearInterval(timerInterval); document.getElementById('timer-display').textContent = `${pad(mins)}:00`; document.getElementById('timer-label').textContent = label + ' Session'; document.getElementById('timer-start-btn').textContent = 'Start'; }
function toggleTimer() { if (timerRunning) { clearInterval(timerInterval); timerRunning = false; document.getElementById('timer-start-btn').textContent = 'Resume'; } else { timerRunning = true; document.getElementById('timer-start-btn').textContent = 'Pause'; timerInterval = setInterval(() => { if (timerSecs <= 0) { clearInterval(timerInterval); timerRunning = false; timerSessions++; document.getElementById('timer-sessions').textContent = timerSessions + 1; document.getElementById('timer-start-btn').textContent = 'Start'; timerSecs = timerMode * 60; document.getElementById('timer-display').textContent = `${pad(timerMode)}:00`; return; } timerSecs--; document.getElementById('timer-display').textContent = `${pad(Math.floor(timerSecs/60))}:${pad(timerSecs%60)}`; }, 1000); } }
function resetTimer() { clearInterval(timerInterval); timerRunning = false; timerSecs = timerMode * 60; document.getElementById('timer-display').textContent = `${pad(timerMode)}:00`; document.getElementById('timer-start-btn').textContent = 'Start'; }

// ---- FLASHCARDS ----
function renderFlashcards() { const cards = lsArr('ss_flashcards_' + currentUser.uid); const decks = [...new Set(cards.map(c => c.deck))]; document.getElementById('deck-tabs').innerHTML = `<button class="deck-tab${currentDeck==='all'?' active':''}" onclick="filterDeck('all')">All</button>` + decks.map(d => `<button class="deck-tab${currentDeck===d?' active':''}" onclick="filterDeck('${d}')">${d}</button>`).join(''); const filtered = currentDeck === 'all' ? cards : cards.filter(c => c.deck === currentDeck); document.getElementById('fc-grid').innerHTML = filtered.length ? filtered.map(c => `<div class="fc-card" onclick="this.classList.toggle('flipped')"><div class="fc-inner"><div class="fc-front-face"><div><div class="fc-deck-label">${c.deck}</div>${c.front}</div></div><div class="fc-back-face">${c.back}</div></div></div>`).join('') : '<div class="empty-state">No flashcards yet</div>'; }
function filterDeck(deck) { currentDeck = deck; renderFlashcards(); }
function addFlashcard() { const deck = document.getElementById('fc-deck').value.trim(); const front = document.getElementById('fc-front').value.trim(); const back = document.getElementById('fc-back').value.trim(); if (!deck || !front || !back) return; const cards = lsArr('ss_flashcards_' + currentUser.uid); cards.push({ id: genId(), deck, front, back }); ls('ss_flashcards_' + currentUser.uid, cards); renderFlashcards(); closeAllModals(); ['fc-deck','fc-front','fc-back'].forEach(id => document.getElementById(id).value = ''); }

// ---- ABSENCES ----
function renderAbsences() {
  const items = lsArr('ss_absences_' + currentUser.uid);
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
  if (unex >= 3) warnings.innerHTML += `<div class="abs-warning">${ICONS.warn} ${unex} unexcused absences — AIP risk!</div>`;
  if (tard >= 3) warnings.innerHTML += `<div class="abs-warning">${ICONS.warn} ${tard} tardies = ${Math.floor(tard/3)} unexcused absence(s)</div>`;
  document.getElementById('abs-log').innerHTML = items.length ? items.map(i => { const badgeCls = i.type === 'Unexcused' ? 'badge-unex' : i.type === 'Tardy' ? 'badge-tardy' : 'badge-excused'; return `<div class="abs-log-item"><span class="abs-type-badge ${badgeCls}">${i.type}</span><span>${i.date}</span><span style="color:var(--gray)">${i.cls}</span><button class="btn-ghost btn-sm" onclick="deleteAbsence('${i.id}')">×</button></div>`; }).join('') : '<div class="empty-state">No absences logged</div>';
}
function logAbsence() { const date = document.getElementById('abs-date').value; const type = document.getElementById('abs-type').value; const cls = document.getElementById('abs-class').value.trim(); if (!date) return; const items = lsArr('ss_absences_' + currentUser.uid); items.unshift({ id: genId(), date, type, cls }); ls('ss_absences_' + currentUser.uid, items); renderAbsences(); closeAllModals(); }
function deleteAbsence(id) { ls('ss_absences_' + currentUser.uid, lsArr('ss_absences_' + currentUser.uid).filter(i => i.id !== id)); renderAbsences(); }

// ---- CALENDAR ----
let selectedCalDate = '';
function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${months[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { const el = document.createElement('div'); el.className = 'cal-day-label'; el.textContent = d; grid.appendChild(el); });
  const first = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = new Date();
  const events = lsArr('ss_calEvents_' + currentUser.uid);
  for (let i = 0; i < first; i++) { const div = document.createElement('div'); div.className = 'cal-day other-month'; div.textContent = new Date(calYear, calMonth, 1-first+i).getDate(); grid.appendChild(div); }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const div = document.createElement('div'); div.className = 'cal-day'; div.textContent = d;
    if (d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) div.classList.add('today');
    const dayEvents = [...events.filter(e => e.date === dateStr), ...HOLIDAYS.filter(h => h.date === dateStr)];
    if (dayEvents.length) { const dots = document.createElement('div'); dots.className = 'cal-dots'; dayEvents.slice(0,3).forEach(e => { const dot = document.createElement('div'); dot.className = 'cal-dot'; const colors = { personal:'#3b82f6', reminder:'#f59e0b', deadline:'#ef4444', school:'#1a56db', holiday:'#f59e0b', dayoff:'#22c55e' }; dot.style.background = colors[e.type] || '#3b82f6'; dots.appendChild(dot); }); div.appendChild(dots); }
    div.onclick = () => openCalDay(dateStr, months[calMonth] + ' ' + d);
    grid.appendChild(div);
  }
}
function changeMonth(dir) { calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function openCalDay(date, label) {
  selectedCalDate = date;
  document.getElementById('cal-modal-title').textContent = `Events for ${label}`;
  const events = lsArr('ss_calEvents_' + currentUser.uid).filter(e => e.date === date);
  const holidays = HOLIDAYS.filter(h => h.date === date);
  document.getElementById('cal-modal-events').innerHTML = [...holidays, ...events].length ? [...holidays, ...events].map(e => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e.title}</span>${e.uid === currentUser.uid ? `<button class="btn-ghost btn-sm" onclick="deleteCalEvent('${e.id}')">×</button>` : ''}</div>`).join('') : '<div class="empty-state" style="padding:8px 0;">No events this day</div>';
  openModal('cal-modal');
}
function addCalEvent() { const title = document.getElementById('cal-event-title').value.trim(); const type = document.getElementById('cal-event-type').value; if (!title) return; if (type === 'school' && !currentUserData.isAdmin) return alert('Only admins can post school events.'); const events = lsArr('ss_calEvents_' + currentUser.uid); events.push({ id: genId(), date: selectedCalDate, title, type, uid: currentUser.uid }); ls('ss_calEvents_' + currentUser.uid, events); renderCalendar(); closeAllModals(); document.getElementById('cal-event-title').value = ''; }
function deleteCalEvent(id) { ls('ss_calEvents_' + currentUser.uid, lsArr('ss_calEvents_' + currentUser.uid).filter(e => e.id !== id)); renderCalendar(); closeAllModals(); }

// ---- ANNOUNCEMENTS (Firestore) ----
async function renderAnnouncements() {
  const school = currentUserData.school;
  const q = query(collection(db, 'announcements'), where('school', '==', school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('ann-list');
    el.innerHTML = items.length ? items.map(a => `<div class="ann-card"><div class="ann-title">${a.title}</div><div class="ann-body">${a.body}</div><div class="ann-meta"><span>${ICONS.pin} ${a.postedByName} • ${a.createdAt?.toDate ? a.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteAnnouncement('${a.id}')">Delete</button>`:''}</div></div>`).join('') : '<div class="empty-state">No announcements yet</div>';
    const latest = items[0];
    const todayAnn = document.getElementById('today-ann');
    if (todayAnn) todayAnn.innerHTML = latest ? `<div style="font-size:14px;font-weight:600;margin-bottom:4px;">${latest.title}</div><div style="font-size:12px;color:var(--gray)">${latest.body.slice(0,100)}...</div>` : '<div class="empty-state">No announcements yet</div>';
  });
  unsubscribers.push(unsub);
}
async function postAnnouncement() {
  if (!currentUserData.isAdmin) return;
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if (!title || !body) return;
  await addDoc(collection(db, 'announcements'), { title, body, postedBy: currentUser.uid, postedByName: currentUserData.name, school: currentUserData.school, createdAt: serverTimestamp() });
  closeAllModals();
  document.getElementById('ann-title').value = ''; document.getElementById('ann-body').value = '';
}
async function deleteAnnouncement(id) { await deleteDoc(doc(db, 'announcements', id)); }

// ---- CLASSROOMS (Firestore) ----
async function renderClassrooms() {
  const school = currentUserData.school;
  const uid = currentUser.uid;
  const q = currentUserData.isTeacher || currentUserData.isAdmin
    ? query(collection(db, 'classrooms'), where('school', '==', school), where('teacherUid', '==', uid))
    : query(collection(db, 'classrooms'), where('school', '==', school), where('students', 'array-contains', uid));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('classroom-list');
    el.innerHTML = items.length ? items.map(c => `<div class="class-card" onclick="openClassroom('${c.id}')"><div class="class-banner" style="background:${c.color}"></div><div class="class-card-body"><div class="class-card-name">${c.name}</div><div class="class-card-teacher">${c.teacherName} • ${c.subject}</div><div class="class-card-code" style="margin-top:8px;">CODE: ${c.code}</div></div></div>`).join('') : '<div class="empty-state">No classes yet. Join a class with a code!</div>';
    document.getElementById('stat-classes').textContent = items.length;
    const dashEl = document.getElementById('dash-classrooms');
    if (dashEl) dashEl.innerHTML = items.length ? items.map(c => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="nav('classroom')"><div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;"></div><span style="font-size:14px;flex:1;">${c.name}</span><span style="font-size:12px;color:var(--gray)">${c.subject}</span></div>`).join('') : '<div class="empty-state">No classes joined yet</div>';
  });
  unsubscribers.push(unsub);
}
async function openClassroom(id) {
  const snap = await getDoc(doc(db, 'classrooms', id));
  if (!snap.exists()) return;
  currentClass = { id, ...snap.data() };
  document.getElementById('cd-title').textContent = currentClass.name;
  document.getElementById('cd-sub').textContent = currentClass.teacherName + ' • ' + currentClass.subject;
  const isTeacher = (currentUserData.isTeacher || currentUserData.isAdmin) && currentClass.teacherUid === currentUser.uid;
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = isTeacher ? '' : 'none');
  renderClassroomDetail();
  nav('classroom-detail');
}
function renderClassroomDetail() {
  if (!currentClass) return;
  const assignments = currentClass.assignments || [];
  const grades = currentClass.grades || {};
  const myGrades = assignments.map(a => ({ ...a, grade: (grades[a.id] || {})[currentUser.uid] }));
  const scored = myGrades.filter(a => a.grade !== undefined && a.grade !== null);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.grade * (a.weight / 100)), 0) / scored.reduce((s, a) => s + a.weight / 100, 0)) : null;
  const gc = document.getElementById('cd-grade-circle');
  gc.textContent = avg !== null ? avg + '%' : '—';
  gc.style.background = avg >= 90 ? '#22c55e' : avg >= 80 ? '#1a56db' : avg >= 70 ? '#f59e0b' : avg !== null ? '#ef4444' : '#1a56db';
  document.getElementById('stat-grade').textContent = avg !== null ? avg + '%' : '—';
  document.getElementById('cd-assignments-list').innerHTML = myGrades.length ? myGrades.map(a => `<div class="assignment-row"><div style="flex:1"><div class="assignment-name">${a.name}</div><div style="font-size:11px;color:var(--gray)">${a.category} • Weight: ${a.weight}%</div></div><div class="assignment-grade" style="color:${a.grade>=90?'#22c55e':a.grade>=70?'#3b82f6':'#ef4444'}">${a.grade !== undefined && a.grade !== null ? a.grade : '—'}</div></div>`).join('') : '<div class="empty-state">No assignments yet</div>';
  renderPassPanels();
}
async function joinClass() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!code || code.length !== 6) return alert('Please enter a valid 6-character code.');
  const q = query(collection(db, 'classrooms'), where('code', '==', code), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  if (snap.empty) return alert('Class not found. Check the code and try again.');
  const classDoc = snap.docs[0];
  const cls = classDoc.data();
  if ((cls.students || []).includes(currentUser.uid)) return alert('You are already in this class!');
  await updateDoc(doc(db, 'classrooms', classDoc.id), { students: arrayUnion(currentUser.uid) });
  renderClassrooms(); closeAllModals(); alert('Joined ' + cls.name + '!');
}
async function createClass() {
  if (!currentUserData.isTeacher && !currentUserData.isAdmin) return;
  const name = document.getElementById('cc-name').value.trim();
  const subject = document.getElementById('cc-subject').value.trim();
  const color = document.getElementById('cc-color').value;
  if (!name || !subject) return;
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  await addDoc(collection(db, 'classrooms'), { name, subject, color, code, teacherUid: currentUser.uid, teacherName: currentUserData.name, school: currentUserData.school, students: [], assignments: [], grades: {}, createdAt: serverTimestamp() });
  renderClassrooms(); closeAllModals(); alert('Class created! Share code: ' + code);
}
async function postAssignment() {
  if (!currentClass) return;
  const name = document.getElementById('pa-name').value.trim();
  const category = document.getElementById('pa-category').value;
  const weight = parseInt(document.getElementById('pa-weight').value) || 10;
  const due = document.getElementById('pa-due').value;
  if (!name) return;
  const newAssignment = { id: genId(), name, category, weight, due };
  const assignments = [...(currentClass.assignments || []), newAssignment];
  await updateDoc(doc(db, 'classrooms', currentClass.id), { assignments });
  currentClass.assignments = assignments;
  renderClassroomDetail(); closeAllModals();
}
function switchCDTab(tab, el) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); ['grades','students','assignments','passes'].forEach(t => { const el2 = document.getElementById('cd-' + t + '-tab'); if (el2) el2.style.display = t === tab ? '' : 'none'; }); }
function calcWhatIf() { const score = parseFloat(document.getElementById('whatif-score').value); const weight = parseFloat(document.getElementById('whatif-weight').value) || 10; if (isNaN(score)) return; document.getElementById('whatif-result').textContent = `This assignment would contribute ${(score * weight / 100).toFixed(1)} points to your grade.`; }

// ---- HALL PASS (Firestore) ----
function openPassRequest() { if (!currentClass) return; document.getElementById('dest-grid').style.display = 'grid'; document.getElementById('pass-pending-screen').style.display = 'none'; document.getElementById('pass-mobile-view').style.display = 'none'; document.getElementById('pass-desktop-view').style.display = 'none'; document.getElementById('pass-request-screen').style.display = ''; nav('hallpass'); }
function selectDest(el, dest, mins) { document.querySelectorAll('.dest-card').forEach(d => d.classList.remove('selected')); el.classList.add('selected'); selectedDest = dest; selectedDestMins = mins; setTimeout(() => submitPassRequest(), 300); }
async function submitPassRequest() {
  const passId = genPassId();
  const pass = { passId, studentUid: currentUser.uid, studentName: currentUserData.name, classId: currentClass.id, destination: selectedDest, duration: selectedDestMins, status: 'pending', school: currentUserData.school, requestedAt: serverTimestamp(), message: null, used: false };
  const ref = await addDoc(collection(db, 'hallpasses'), pass);
  activePassId = ref.id;
  document.getElementById('dest-grid').style.display = 'none';
  document.getElementById('pass-request-screen').style.display = 'none';
  document.getElementById('pass-pending-screen').style.display = '';
  // listen for approval
  const unsub = onSnapshot(doc(db, 'hallpasses', ref.id), snap => {
    const data = snap.data();
    if (data && data.status === 'active') { unsub(); showActivePass({ id: ref.id, ...data }); }
    if (data && data.status === 'denied') { unsub(); document.getElementById('pass-pending-screen').style.display = 'none'; document.getElementById('pass-request-screen').style.display = ''; alert('Your pass request was denied by the teacher.'); nav('classroom'); }
  });
}
function showActivePass(pass) {
  document.getElementById('pass-pending-screen').style.display = 'none';
  const isMobile = window.innerWidth <= 768;
  document.getElementById('pass-mobile-view').style.display = isMobile ? '' : 'none';
  document.getElementById('pass-desktop-view').style.display = isMobile ? 'none' : '';
  const issued = pass.approvedAt?.toDate ? pass.approvedAt.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  ['pass-avatar','pass-student-name','pass-school-name','pass-dest-name','pass-id-display','pass-issued','pass-limit','pass-approved-by','desktop-dest-name','desktop-pass-id','desktop-student-name','desktop-issued','desktop-limit','desktop-approved','pass-id-desktop'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'pass-avatar') { el.textContent = currentUserData.name[0]; el.style.background = currentUserData.avatar; }
    else if (id === 'pass-student-name' || id === 'desktop-student-name') el.textContent = currentUserData.name;
    else if (id === 'pass-school-name') el.textContent = currentUserData.school;
    else if (id === 'pass-dest-name' || id === 'desktop-dest-name') el.textContent = pass.destination;
    else if (id === 'pass-id-display') el.textContent = '#' + pass.passId;
    else if (id === 'desktop-pass-id' || id === 'pass-id-desktop') el.textContent = '#' + pass.passId;
    else if (id === 'pass-issued' || id === 'desktop-issued') el.textContent = issued;
    else if (id === 'pass-limit' || id === 'desktop-limit') el.textContent = pass.duration + ' min';
    else if (id === 'pass-approved-by' || id === 'desktop-approved') el.textContent = pass.approvedBy || 'Teacher';
  });
  passTotal = pass.duration * 60; passRemaining = passTotal;
  clearInterval(passTimerInterval);
  passTimerInterval = setInterval(tickPass, 1000);
}
function tickPass() { if (passRemaining <= 0) { clearInterval(passTimerInterval); updatePassTimer(0); return; } passRemaining--; updatePassTimer(passRemaining); }
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
  if (destBox) destBox.style.borderColor = pct <= 0.2 ? '#ef4444' : pct <= 0.5 ? '#f59e0b' : '#22c55e';
}
async function endPass() {
  clearInterval(passTimerInterval);
  if (activePassId) await updateDoc(doc(db, 'hallpasses', activePassId), { status: 'completed', used: true });
  activePassId = null;
  nav('classroom');
}
async function sendPassReply() { const text = document.getElementById('pass-reply-input').value.trim(); if (!text || !activePassId) return; await updateDoc(doc(db, 'hallpasses', activePassId), { studentReply: text }); alert('Reply sent!'); document.getElementById('pass-reply-input').value = ''; }
async function sendPassReplyDesktop() { const text = document.getElementById('desktop-reply-input').value.trim(); if (!text || !activePassId) return; await updateDoc(doc(db, 'hallpasses', activePassId), { studentReply: text }); alert('Reply sent!'); document.getElementById('desktop-reply-input').value = ''; }
async function renderPassPanels() {
  if (!currentClass) return;
  const school = currentUserData.school;
  const q = query(collection(db, 'hallpasses'), where('classId', '==', currentClass.id), where('school', '==', school));
  const snap = await getDocs(q);
  const passes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const pending = passes.filter(p => p.status === 'pending');
  const active = passes.filter(p => p.status === 'active');
  const pEl = document.getElementById('pending-passes');
  if (pEl) pEl.innerHTML = pending.length ? pending.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}')">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}')">Deny</button></div></div>`).join('') : '<div class="empty-state">No pending requests</div>';
  const aEl = document.getElementById('active-passes');
  if (aEl) aEl.innerHTML = active.length ? active.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination}<br><span style="font-size:11px;color:var(--gray)">#${p.passId}</span></div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}')">End</button></div></div>`).join('') : '<div class="empty-state">No active passes</div>';
  renderTPPanels();
}
async function approvePass(id) { await updateDoc(doc(db, 'hallpasses', id), { status: 'active', approvedAt: serverTimestamp(), approvedBy: currentUserData.name }); renderPassPanels(); }
async function denyPass(id) { await updateDoc(doc(db, 'hallpasses', id), { status: 'denied', used: true }); renderPassPanels(); }
async function endPassTeacher(id) { await updateDoc(doc(db, 'hallpasses', id), { status: 'completed', used: true }); renderPassPanels(); }
async function sendTeacherMsg(id) { const msg = prompt('Send message to student:'); if (!msg) return; await updateDoc(doc(db, 'hallpasses', id), { message: msg }); alert('Message sent!'); }
async function verifyPass() { const input = document.getElementById('verify-pass-input').value.trim().replace('#','').toUpperCase(); await verifyPassById(input, 'verify-result'); }
async function verifyPassTeacher() { const input = document.getElementById('tp-verify-input').value.trim().replace('#','').toUpperCase(); await verifyPassById(input, 'tp-verify-result'); }
async function verifyPassById(passId, resultElId) {
  const el = document.getElementById(resultElId);
  el.innerHTML = '<div style="color:var(--gray);font-size:13px;">Checking...</div>';
  const q = query(collection(db, 'hallpasses'), where('passId', '==', passId), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  if (snap.empty) { el.innerHTML = `<div class="verify-invalid">${ICONS.x} INVALID — Pass ID #${passId} does not exist or was never issued.</div>`; return; }
  const pass = { id: snap.docs[0].id, ...snap.docs[0].data() };
  if (pass.status === 'active') el.innerHTML = `<div class="verify-valid">${ICONS.check} VALID — Pass #${passId} is currently active.<br><strong>Student:</strong> ${pass.studentName}<br><strong>Destination:</strong> ${pass.destination}<br><strong>Duration:</strong> ${pass.duration} min</div>`;
  else if (pass.status === 'completed' || pass.used) el.innerHTML = `<div class="verify-expired">${ICONS.warn} EXPIRED — Pass #${passId} has already been used and is no longer valid.</div>`;
  else if (pass.status === 'pending') el.innerHTML = `<div class="verify-expired">${ICONS.clock} PENDING — Pass #${passId} is awaiting teacher approval.</div>`;
  else if (pass.status === 'denied') el.innerHTML = `<div class="verify-invalid">${ICONS.x} DENIED — Pass #${passId} was denied by the teacher.</div>`;
}
async function renderTPPanels() {
  const q = query(collection(db, 'hallpasses'), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  const passes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const pending = passes.filter(p => p.status === 'pending');
  const active = passes.filter(p => p.status === 'active');
  const pEl = document.getElementById('tp-pending');
  if (pEl) pEl.innerHTML = pending.length ? pending.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}');renderTPPanels()">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}');renderTPPanels()">Deny</button></div></div>`).join('') : '<div class="empty-state">No pending requests</div>';
  const aEl = document.getElementById('tp-active');
  if (aEl) aEl.innerHTML = active.length ? active.map(p => `<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination}<br><span style="font-size:11px;color:var(--gray)">#${p.passId}</span></div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}');renderTPPanels()">End</button></div></div>`).join('') : '<div class="empty-state">No active passes</div>';
}

// ---- CLUBS (Firestore) ----
async function renderClubs() {
  const q = query(collection(db, 'clubs'), where('school', '==', currentUserData.school));
  const unsub = onSnapshot(q, snap => {
    const clubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('clubs-list').innerHTML = clubs.length ? clubs.map(c => `<div class="club-card"><div class="club-emoji">${c.emoji}</div><div class="club-name">${c.name}</div><div class="club-desc">${c.description}</div><div class="club-role-badge">${c.president === currentUser.uid ? 'President' : (c.members||[]).includes(currentUser.uid) ? 'Member' : 'Not joined'}</div></div>`).join('') : '<div class="empty-state">No clubs yet</div>';
  });
  unsubscribers.push(unsub);
}
async function createClub() {
  if (!currentUserData.isAdmin) return;
  const name = document.getElementById('club-name').value.trim();
  const description = document.getElementById('club-desc').value.trim();
  const emoji = document.getElementById('club-emoji').value || '🎯';
  if (!name) return;
  await addDoc(collection(db, 'clubs'), { name, description, emoji, president: currentUser.uid, members: [currentUser.uid], school: currentUserData.school, createdAt: serverTimestamp() });
  closeAllModals(); ['club-name','club-desc','club-emoji'].forEach(id => document.getElementById(id).value = '');
}

// ---- SPORTS (Firestore) ----
async function renderSports() {
  const q = query(collection(db, 'sports'), where('school', '==', currentUserData.school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('sports-list').innerHTML = items.length ? items.map(s => { const result = parseInt(s.ourScore) > parseInt(s.theirScore) ? 'WIN' : parseInt(s.ourScore) < parseInt(s.theirScore) ? 'LOSS' : 'TIE'; const cls = result === 'WIN' ? 'wlt-win' : result === 'LOSS' ? 'wlt-loss' : 'wlt-tie'; return `<div class="sport-card"><div class="sport-header"><span class="sport-tag">${s.sport}</span><span class="wlt-badge ${cls}">${result}</span></div><div class="score-row"><div class="score-team"><div class="score-team-name">Panthers</div><div class="score-num">${s.ourScore}</div></div><div class="score-vs">VS</div><div class="score-team"><div class="score-team-name">${s.opponent}</div><div class="score-num">${s.theirScore}</div></div></div><div style="font-size:12px;color:var(--gray);margin-top:10px;">${s.date}</div>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" style="margin-top:8px;" onclick="deleteSport('${s.id}')">Delete</button>`:''}</div>`; }).join('') : '<div class="empty-state">No game results yet</div>';
  });
  unsubscribers.push(unsub);
}
async function addSportResult() {
  const sport = document.getElementById('sport-type').value;
  const opponent = document.getElementById('sport-opp').value.trim();
  const ourScore = document.getElementById('sport-us').value;
  const theirScore = document.getElementById('sport-them').value;
  const date = document.getElementById('sport-date').value;
  if (!opponent || !ourScore || !theirScore || !date) return;
  await addDoc(collection(db, 'sports'), { sport, opponent, ourScore, theirScore, date, school: currentUserData.school, postedBy: currentUser.uid, createdAt: serverTimestamp() });
  closeAllModals(); ['sport-opp','sport-us','sport-them','sport-date'].forEach(id => document.getElementById(id).value = '');
}
async function deleteSport(id) { await deleteDoc(doc(db, 'sports', id)); }

// ---- POLLS (Firestore) ----
async function renderPolls() {
  const q = query(collection(db, 'polls'), where('school', '==', currentUserData.school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('polls-list').innerHTML = items.length ? items.map(p => {
      const totalVotes = Object.values(p.votes || {}).length;
      const voted = (p.votes || {})[currentUser.uid] !== undefined;
      const optHTML = p.options.map((opt, i) => { const count = Object.values(p.votes || {}).filter(v => v === i).length; const pct = totalVotes ? Math.round(count / totalVotes * 100) : 0; return `<div class="poll-opt" onclick="${!voted?`castVote('${p.id}',${i})`:''}"><div class="poll-opt-label"><span>${opt}</span><span>${pct}%</span></div><div class="poll-bar"><div class="poll-fill" style="width:${pct}%"></div></div></div>`; }).join('');
      return `<div class="poll-card"><div class="poll-q">${p.question}</div>${optHTML}<div style="font-size:12px;color:var(--gray);margin-top:8px;">${totalVotes} votes${currentUserData.isAdmin?` • <button class="btn-ghost btn-sm" onclick="deletePoll('${p.id}')">Delete</button>`:''}</div></div>`;
    }).join('') : '<div class="empty-state">No polls yet</div>';
  });
  unsubscribers.push(unsub);
}
async function createPoll() {
  if (!currentUserData.isAdmin) return;
  const q = document.getElementById('poll-q').value.trim();
  const opts = ['poll-o1','poll-o2','poll-o3','poll-o4'].map(id => document.getElementById(id).value.trim()).filter(Boolean);
  if (!q || opts.length < 2) return;
  await addDoc(collection(db, 'polls'), { question: q, options: opts, votes: {}, school: currentUserData.school, createdAt: serverTimestamp(), postedBy: currentUser.uid });
  closeAllModals(); ['poll-q','poll-o1','poll-o2','poll-o3','poll-o4'].forEach(id => document.getElementById(id).value = '');
}
async function castVote(pollId, optIdx) {
  const pollRef = doc(db, 'polls', pollId);
  const snap = await getDoc(pollRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if ((data.votes || {})[currentUser.uid] !== undefined) return;
  await updateDoc(pollRef, { [`votes.${currentUser.uid}`]: optIdx });
}
async function deletePoll(id) { await deleteDoc(doc(db, 'polls', id)); }

// ---- DIRECTORY (Firestore) ----
async function renderDirectory() {
  const q = query(collection(db, 'users'), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  const users = snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid);
  displayDir(users);
}
function displayDir(users) {
  document.getElementById('dir-list').innerHTML = users.length ? users.map(u => `<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div><div style="flex:1"><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div><span class="role-badge ${u.isAdmin?'role-admin':u.isTeacher?'role-teacher':'role-student'}">${u.isAdmin?'Admin':u.isTeacher?'Teacher':'Student'}</span></div>`).join('') : '<div class="empty-state">No other students found</div>';
}
async function filterDir() {
  const q2 = document.getElementById('dir-search').value.toLowerCase();
  const q = query(collection(db, 'users'), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  const users = snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid && u.name.toLowerCase().includes(q2));
  displayDir(users);
}

// ---- LOST & FOUND (Firestore) ----
async function renderLostFound() {
  const q = query(collection(db, 'lostfound'), where('school', '==', currentUserData.school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('lf-list').innerHTML = items.length ? items.map(i => `<div class="lf-card"><div class="lf-status-badge ${i.status==='Lost'?'lf-lost':'lf-found'}">${i.status.toUpperCase()}</div><div style="flex:1"><div class="lf-name">${i.name}</div><div class="lf-loc">${i.location} • ${i.postedByName}</div></div>${i.postedBy===currentUser.uid||currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteLF('${i.id}')">×</button>`:''}</div>`).join('') : '<div class="empty-state">No items posted</div>';
  });
  unsubscribers.push(unsub);
}
async function addLF() {
  const name = document.getElementById('lf-item').value.trim();
  const location = document.getElementById('lf-loc').value.trim();
  const status = document.getElementById('lf-status').value;
  if (!name) return;
  await addDoc(collection(db, 'lostfound'), { name, location, status, postedBy: currentUser.uid, postedByName: currentUserData.name, school: currentUserData.school, createdAt: serverTimestamp() });
  closeAllModals(); ['lf-item','lf-loc'].forEach(id => document.getElementById(id).value = '');
}
async function deleteLF(id) { await deleteDoc(doc(db, 'lostfound', id)); }

// ---- CARPOOL (Firestore) ----
async function renderCarpool() {
  const q = query(collection(db, 'carpool'), where('school', '==', currentUserData.school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('cp-list').innerHTML = items.length ? items.map(i => `<div class="cp-card"><div class="cp-icon">${parseInt(i.seats)>0?ICONS.car:ICONS.hand}</div><div style="flex:1"><div class="cp-area">${i.area}</div><div class="cp-info">${i.contact}</div></div><div class="cp-seats-badge">${parseInt(i.seats)>0?i.seats+' seats':'Looking'}</div>${i.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteCP('${i.id}')">×</button>`:''}</div>`).join('') : '<div class="empty-state">No carpool posts yet</div>';
  });
  unsubscribers.push(unsub);
}
async function addCarpool() {
  const area = document.getElementById('cp-area').value.trim();
  const seats = document.getElementById('cp-seats').value;
  const contact = document.getElementById('cp-contact').value.trim();
  if (!area || !contact) return;
  await addDoc(collection(db, 'carpool'), { area, seats: seats || '0', contact, postedBy: currentUser.uid, school: currentUserData.school, createdAt: serverTimestamp() });
  closeAllModals(); ['cp-area','cp-seats','cp-contact'].forEach(id => document.getElementById(id).value = '');
}
async function deleteCP(id) { await deleteDoc(doc(db, 'carpool', id)); }

// ---- GROUP CHATS (Firestore) ----
async function renderChats() {
  const q = query(collection(db, 'chats'), where('school', '==', currentUserData.school), where('memberEmails', 'array-contains', currentUserData.email));
  const unsub = onSnapshot(q, snap => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('chat-list');
    el.innerHTML = chats.length ? chats.map(c => { const daysLeft = Math.max(0, 14 - Math.floor((Date.now() - (c.createdAt?.toDate ? c.createdAt.toDate().getTime() : Date.now())) / 86400000)); return `<div class="chat-item" onclick="openChat('${c.id}')"><div class="chat-item-name">${c.name}</div><div class="chat-item-preview">${c.lastMessage || 'No messages yet'}</div><div class="chat-item-meta"><span></span><span class="chat-expires-badge">${daysLeft}d left</span></div></div>`; }).join('') : '<div class="empty-state">No chats yet</div>';
  });
  unsubscribers.push(unsub);
}
async function createChat() {
  const name = document.getElementById('new-chat-name').value.trim();
  if (!name) return;
  const memberEmails = [currentUserData.email, ...chatMembers];
  await addDoc(collection(db, 'chats'), { name, memberEmails, school: currentUserData.school, createdAt: serverTimestamp(), lastMessage: null });
  chatMembers = [];
  document.getElementById('chat-members-list').innerHTML = '';
  renderChats(); closeAllModals();
  document.getElementById('new-chat-name').value = '';
}
async function addChatMember() {
  const email = document.getElementById('chat-member-email').value.trim();
  if (!email) return;
  const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  if (snap.empty) return alert('No user found with that email at your school.');
  if (chatMembers.includes(email)) return alert('Already added!');
  const user = snap.docs[0].data();
  chatMembers.push(email);
  document.getElementById('chat-members-list').innerHTML += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);"><div class="dir-avatar" style="background:${user.avatar};width:28px;height:28px;font-size:11px;">${user.name[0]}</div>${user.name} <span style="color:var(--gray)">(${email})</span></div>`;
  document.getElementById('chat-member-email').value = '';
}
async function openChat(id) {
  currentChat = id;
  const chatRef = doc(db, 'chats', id);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return;
  const chat = chatSnap.data();
  const chatPanel = document.getElementById('chat-main-panel');
  chatPanel.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:15px;font-weight:600;">${chat.name}</div><div class="chat-messages" id="chat-messages"></div><div class="chat-input-area"><input class="chat-input" placeholder="Message..." id="chat-input" onkeydown="if(event.key==='Enter')sendChatMsg()"><button class="chat-send" onclick="sendChatMsg()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg></button></div>`;
  const messagesRef = collection(db, 'chats', id, 'messages');
  const q = query(messagesRef, orderBy('sentAt'));
  const unsub = onSnapshot(q, snap => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = messages.length ? messages.map(m => `<div class="chat-msg ${m.uid === currentUser.uid ? 'me' : 'other'}">${m.uid !== currentUser.uid ? `<div class="chat-msg-sender">${m.name}</div>` : ''}<div class="chat-msg-bubble">${m.text}</div></div>`).join('') : '<div class="empty-state">No messages yet. Say something!</div>';
    el.scrollTop = el.scrollHeight;
  });
  unsubscribers.push(unsub);
}
async function sendChatMsg() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim() || !currentChat) return;
  const text = input.value.trim();
  input.value = '';
  await addDoc(collection(db, 'chats', currentChat, 'messages'), { text, uid: currentUser.uid, name: currentUserData.name, sentAt: serverTimestamp() });
  await updateDoc(doc(db, 'chats', currentChat), { lastMessage: text });
}

// ---- STUDY GROUPS (Firestore) ----
async function renderStudyGroups() {
  const q = query(collection(db, 'studygroups'), where('school', '==', currentUserData.school), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('sg-list').innerHTML = items.length ? items.map(s => { const full = (s.members||[]).length >= s.spots; return `<div class="sg-card"><div class="sg-info"><div class="sg-subject">${s.subject}</div><div class="sg-details">📍 ${s.location} • ${s.time ? new Date(s.time).toLocaleString() : 'TBD'}</div><div class="sg-details">${(s.members||[]).length}/${s.spots} spots</div></div><span class="sg-spots-badge ${full?'sg-full':'sg-open'}">${full?'FULL':'OPEN'}</span>${!full&&!(s.members||[]).includes(currentUser.uid)?`<button class="btn-blue btn-sm" onclick="joinStudyGroup('${s.id}')">Join</button>`:''}${s.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteSG('${s.id}')">×</button>`:''}</div>`; }).join('') : '<div class="empty-state">No study groups yet</div>';
  });
  unsubscribers.push(unsub);
}
async function addStudyGroup() {
  const subject = document.getElementById('sg-subj').value.trim();
  const location = document.getElementById('sg-loc').value.trim();
  const time = document.getElementById('sg-time').value;
  const spots = parseInt(document.getElementById('sg-spots').value) || 5;
  if (!subject) return;
  await addDoc(collection(db, 'studygroups'), { subject, location, time, spots, members: [currentUser.uid], postedBy: currentUser.uid, school: currentUserData.school, createdAt: serverTimestamp() });
  closeAllModals();
}
async function joinStudyGroup(id) { await updateDoc(doc(db, 'studygroups', id), { members: arrayUnion(currentUser.uid) }); }
async function deleteSG(id) { await deleteDoc(doc(db, 'studygroups', id)); }

// ---- REMINDERS (localStorage — personal) ----
function renderReminders() {
  const items = lsArr('ss_reminders_' + currentUser.uid).sort((a,b) => new Date(a.date) - new Date(b.date));
  document.getElementById('rem-list').innerHTML = items.length ? items.map(r => { const days = r.date ? Math.ceil((new Date(r.date) - new Date()) / 86400000) : null; const cls = days === null ? 'var(--gray)' : days <= 0 ? 'var(--red)' : days === 1 ? 'var(--gold)' : 'var(--blue-light)'; const label = days === null ? '—' : days <= 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : days; return `<div class="rem-card"><div class="rem-days" style="color:${cls}">${label}</div><div style="flex:1"><div class="rem-text">${r.text}</div>${r.date?`<div class="rem-date">${r.date}</div>`:''}</div><button class="btn-ghost btn-sm" onclick="deleteReminder('${r.id}')">×</button></div>`; }).join('') : '<div class="empty-state">No reminders yet</div>';
}
function addReminder() { const text = document.getElementById('rem-text').value.trim(); const date = document.getElementById('rem-date').value; if (!text) return; const items = lsArr('ss_reminders_' + currentUser.uid); items.push({ id: genId(), text, date }); ls('ss_reminders_' + currentUser.uid, items); renderReminders(); closeAllModals(); document.getElementById('rem-text').value = ''; document.getElementById('rem-date').value = ''; }
function deleteReminder(id) { ls('ss_reminders_' + currentUser.uid, lsArr('ss_reminders_' + currentUser.uid).filter(r => r.id !== id)); renderReminders(); }

// ---- PROFILE ----
function renderProfile() { const av = document.getElementById('profile-avatar-big'); av.textContent = currentUserData.name[0].toUpperCase(); av.style.background = currentUserData.avatar; document.getElementById('profile-name-input').value = currentUserData.name; }
function selectAvatar(el, gradient) {
  document.querySelectorAll('.avatar-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('profile-avatar-big').style.background = gradient;
  updateDoc(doc(db, 'users', currentUser.uid), { avatar: gradient });
  currentUserData.avatar = gradient;
  document.getElementById('sidebar-avatar').style.background = gradient;
}
async function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  if (!name) return;
  await updateDoc(doc(db, 'users', currentUser.uid), { name });
  currentUserData.name = name;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('profile-avatar-big').textContent = name[0].toUpperCase();
  document.getElementById('sidebar-avatar').textContent = name[0].toUpperCase();
  alert('Profile saved!');
}

// ---- ADMIN ----
async function approveTeacher() {
  const email = document.getElementById('teacher-email-input').value.trim().toLowerCase();
  if (!email) return;
  const school = currentUserData.school;
  await setDoc(doc(db, 'schoolRoles', school), { teachers: arrayUnion(email) }, { merge: true });
  // upgrade user if already signed up
  const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', school));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(doc(db, 'users', snap.docs[0].id), { isTeacher: true, role: 'teacher' });
  renderApprovedTeachers();
  document.getElementById('teacher-email-input').value = '';
  alert('Teacher access granted!');
}
async function grantAdmin() {
  const email = document.getElementById('admin-email-input').value.trim().toLowerCase();
  if (!email) return;
  const school = currentUserData.school;
  await setDoc(doc(db, 'schoolRoles', school), { admins: arrayUnion(email), teachers: arrayUnion(email) }, { merge: true });
  const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', school));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(doc(db, 'users', snap.docs[0].id), { isAdmin: true, isTeacher: true, role: 'teacher' });
  renderApprovedAdmins();
  document.getElementById('admin-email-input').value = '';
  alert('Admin access granted!');
}
async function renderApprovedTeachers() {
  const school = currentUserData.school;
  const snap = await getDoc(doc(db, 'schoolRoles', school));
  const data = snap.exists() ? snap.data() : {};
  const teachers = data.teachers || [];
  const el = document.getElementById('approved-teachers-list');
  if (!el) return;
  el.innerHTML = teachers.map(e => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeTeacher('${e}')">Remove</button></div>`).join('') || '<div style="font-size:12px;color:var(--gray);padding:6px 0;">No teachers added yet</div>';
}
async function renderApprovedAdmins() {
  const school = currentUserData.school;
  const snap = await getDoc(doc(db, 'schoolRoles', school));
  const data = snap.exists() ? snap.data() : {};
  const admins = data.admins || [];
  const el = document.getElementById('approved-admins-list');
  if (!el) return;
  el.innerHTML = admins.map(e => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeAdmin('${e}')">Remove</button></div>`).join('') || '<div style="font-size:12px;color:var(--gray);padding:6px 0;">No admins added yet</div>';
}
async function removeTeacher(email) {
  await updateDoc(doc(db, 'schoolRoles', currentUserData.school), { teachers: arrayRemove(email) });
  const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(doc(db, 'users', snap.docs[0].id), { isTeacher: false, role: 'student' });
  renderApprovedTeachers();
}
async function removeAdmin(email) {
  if (email === 'mykahsheppard@g.horrycountyschools.net') return alert("Can't remove the founder!");
  await updateDoc(doc(db, 'schoolRoles', currentUserData.school), { admins: arrayRemove(email) });
  const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', currentUserData.school));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(doc(db, 'users', snap.docs[0].id), { isAdmin: false });
  renderApprovedAdmins();
}
async function bulkApproveTeachers() {
  const emails = document.getElementById('bulk-teachers').value.split('\n').map(e => e.trim().toLowerCase()).filter(Boolean);
  const school = currentUserData.school;
  for (const email of emails) {
    await setDoc(doc(db, 'schoolRoles', school), { teachers: arrayUnion(email) }, { merge: true });
    const q = query(collection(db, 'users'), where('email', '==', email), where('school', '==', school));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(doc(db, 'users', snap.docs[0].id), { isTeacher: true, role: 'teacher' });
  }
  renderApprovedTeachers();
  document.getElementById('bulk-teachers').value = '';
  alert(`${emails.length} teachers granted access!`);
}

// ---- MODALS ----
function openModal(id) { document.querySelector('.modal-overlay').classList.add('open'); document.getElementById(id).classList.add('open'); }
function closeAllModals() { document.querySelector('.modal-overlay').classList.remove('open'); document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); }

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
});
