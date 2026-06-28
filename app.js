// THEME
let isDark = false;
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('theme-label').textContent = isDark ? 'Light' : 'Dark';
}

// CLOCK
function updateClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  document.getElementById('clock').textContent = `${hh}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('clock-date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const mins = h * 60 + m;
  const periods = [
    {n:'1st Block', s:8*60+20, e:9*60+50},
    {n:'2nd Block', s:9*60+57, e:11*60+27},
    {n:'Lunch',     s:11*60+34,e:12*60+8},
    {n:'3rd Block', s:12*60+13,e:13*60+43},
    {n:'4th Block', s:13*60+52,e:15*60+20}
  ];
  let cur = null;
  for (const p of periods) { if (mins >= p.s && mins < p.e) { cur = p; break; } }
  if (cur) {
    document.getElementById('period-name').textContent = cur.n;
    const left = cur.e - mins;
    document.getElementById('period-countdown').textContent = `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} left`;
    const pct = ((mins - cur.s) / (cur.e - cur.s) * 100).toFixed(0);
    document.getElementById('progress-fill').style.width = pct + '%';
  } else {
    document.getElementById('period-name').textContent = 'No class right now';
    document.getElementById('period-countdown').textContent = '—';
  }
}
setInterval(updateClock, 1000);
updateClock();

// BARCODE
(function() {
  const bc = document.getElementById('barcode');
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    const w = [1,1,2,2,1,3][Math.floor(Math.random()*6)];
    const h = 14 + Math.random() * 14;
    s.style.cssText = `width:${w}px;height:${h}px;display:inline-block;`;
    bc.appendChild(s);
  }
})();

// TABS
function switchTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  el.classList.add('active');
}

const subtabMap = {
  academic: ['hw-tab','notes-tab','deadlines-tab','flashcards-tab','timer-tab','absences-tab'],
  school: ['cal-tab','ann-tab','class-tab','pass-tab','clubs-tab','sports-tab','polls-tab','lf-tab','dir-tab'],
  social: ['chats-tab','sg-tab','rem-tab','cp-tab'],
  profile: ['profile-tab','admin-tab']
};

function switchSubtab(section, tabId, el) {
  const parent = document.getElementById('sec-' + section);
  parent.querySelectorAll('.subtab').forEach(t => t.classList.remove('active'));
  subtabMap[section].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  document.getElementById(tabId).style.display = '';
  el.classList.add('active');
}

// HOMEWORK
function toggleHW(el) {
  const done = el.classList.toggle('done');
  el.textContent = done ? '✓' : '';
  const label = el.nextElementSibling?.querySelector('.hw-label');
  if (label) label.classList.toggle('done', done);
}
function addHW() {
  const n = document.getElementById('hw-name-input').value.trim();
  const c = document.getElementById('hw-class-input').value;
  if (!n) return;
  const div = document.createElement('div'); div.className = 'hw-item';
  div.innerHTML = `<div class="hw-check" onclick="toggleHW(this)"></div><div style="flex:1"><div class="hw-label">${n}</div><div class="hw-class">${c}</div></div><div class="hw-due due-blue">Added</div><button class="del-btn" onclick="this.closest('.hw-item').remove()">×</button>`;
  document.getElementById('hw-list').appendChild(div);
  document.getElementById('hw-name-input').value = '';
}

// NOTES
function selectChip(el) {
  el.closest('.chip-row').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}
function saveNote() {
  const text = document.getElementById('notes-area').value.trim();
  const cls = document.querySelector('.chip.active')?.textContent || 'General';
  if (!text) return;
  const div = document.createElement('div'); div.className = 'note-saved'; div.style.marginTop = '8px';
  div.innerHTML = `<div class="note-class">${cls}</div>${text}`;
  document.getElementById('notes-list').appendChild(div);
  document.getElementById('notes-area').value = '';
}

// DEADLINES
function addDeadline() {
  const n = document.getElementById('dl-name').value.trim();
  const c = document.getElementById('dl-class').value;
  const t = document.getElementById('dl-type').value;
  const d = document.getElementById('dl-date').value;
  if (!n) return;
  const days = d ? Math.ceil((new Date(d) - new Date()) / (1000*60*60*24)) : 999;
  const cls = days <= 1 ? 'dl-red' : days <= 7 ? 'dl-yellow' : 'dl-blue';
  const label = days <= 0 ? 'TODAY' : days === 1 ? 'Tomorrow' : `${days} days`;
  const div = document.createElement('div'); div.className = 'deadline-item';
  div.innerHTML = `<div class="dl-dot" style="background:var(--teal)"></div><div style="flex:1"><div class="dl-name">${n}</div><div class="dl-sub">${c} • ${t}</div></div><div class="dl-badge ${cls}">${label}</div><button class="del-btn" onclick="this.closest('.deadline-item').remove()">×</button>`;
  document.getElementById('dl-list').appendChild(div);
  document.getElementById('dl-name').value = '';
}

// FLASHCARDS
const cards = [
  {q:'What is the powerhouse of the cell?', a:'The Mitochondria'},
  {q:'What is the speed of light?', a:'299,792,458 m/s'},
  {q:'What is the chemical formula for water?', a:'H₂O'}
];
let cardIdx = 0, flipped = false;
function showCard() {
  document.getElementById('fc-q').textContent = cards[cardIdx].q;
  document.getElementById('fc-a').textContent = cards[cardIdx].a;
  document.getElementById('fc-counter').textContent = `${cardIdx+1} / ${cards.length}`;
  document.getElementById('flashcard').classList.remove('flipped');
  flipped = false;
}
function flipCard() { flipped = !flipped; document.getElementById('flashcard').classList.toggle('flipped', flipped); }
function nextCard() { cardIdx = (cardIdx+1) % cards.length; showCard(); }
function prevCard() { cardIdx = (cardIdx-1+cards.length) % cards.length; showCard(); }
function addCard() {
  const q = document.getElementById('fc-front-in').value.trim();
  const a = document.getElementById('fc-back-in').value.trim();
  if (!q || !a) return;
  cards.push({q, a});
  document.getElementById('fc-front-in').value = '';
  document.getElementById('fc-back-in').value = '';
  cardIdx = cards.length - 1; showCard();
}

// STUDY TIMER
let timerInterval = null, timerSecs = 25*60, timerRunning = false, timerMode = 25, sessions = 0;
function setMode(mins, label, el) {
  el.closest('.chip-row').querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  timerMode = mins; timerSecs = mins * 60; timerRunning = false;
  clearInterval(timerInterval);
  document.getElementById('timer-display').textContent = `${String(mins).padStart(2,'0')}:00`;
  document.getElementById('t-mode').textContent = label + ' Session';
  document.getElementById('timer-btn').textContent = 'Start';
}
function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false;
    document.getElementById('timer-btn').textContent = 'Resume';
  } else {
    timerRunning = true; document.getElementById('timer-btn').textContent = 'Pause';
    timerInterval = setInterval(() => {
      if (timerSecs <= 0) {
        clearInterval(timerInterval); timerRunning = false; sessions++;
        document.getElementById('session-count').textContent = sessions;
        document.getElementById('timer-btn').textContent = 'Start';
        timerSecs = timerMode * 60;
        document.getElementById('timer-display').textContent = `${String(timerMode).padStart(2,'0')}:00`;
        return;
      }
      timerSecs--;
      const m = Math.floor(timerSecs/60), s = timerSecs % 60;
      document.getElementById('timer-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
  }
}
function resetTimer() {
  clearInterval(timerInterval); timerRunning = false; timerSecs = timerMode * 60;
  document.getElementById('timer-display').textContent = `${String(timerMode).padStart(2,'0')}:00`;
  document.getElementById('timer-btn').textContent = 'Start';
}

// CALENDAR
let calYear = 2026, calMonth = 5;
function renderCal() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${months[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const div = document.createElement('div'); div.className = 'cal-day-label'; div.textContent = d; grid.appendChild(div);
  });
  const first = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = new Date();
  for (let i = 0; i < first; i++) {
    const div = document.createElement('div'); div.className = 'cal-day other-month';
    div.textContent = new Date(calYear, calMonth, 1-first+i).getDate(); grid.appendChild(div);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement('div'); div.className = 'cal-day'; div.textContent = d;
    if (d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) div.classList.add('today');
    if ([3,4,5].includes(d) && calMonth === 5) div.classList.add('has-event');
    div.onclick = () => alert(`${months[calMonth]} ${d}, ${calYear}\nClick to add/view events`);
    grid.appendChild(div);
  }
}
function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCal();
}
renderCal();

// CLASSROOMS
function openClassroom(name, teacher, grade, color) {
  document.getElementById('class-list-view').style.display = 'none';
  document.getElementById('class-detail-view').style.display = '';
  document.getElementById('cd-name').textContent = name;
  document.getElementById('cd-teacher').textContent = teacher;
  document.getElementById('cd-grade').textContent = grade;
  document.getElementById('cd-grade').style.background = color;
}
function closeClassroom() {
  document.getElementById('class-list-view').style.display = '';
  document.getElementById('class-detail-view').style.display = 'none';
}
function joinClass() {
  const code = document.getElementById('join-code').value.trim();
  if (code) alert(`Joining class with code: ${code}`);
  document.getElementById('join-code').value = '';
}
function calcWhatIf() {
  const g = parseFloat(document.getElementById('whatif-grade').value);
  const w = parseFloat(document.getElementById('whatif-weight').value) || 10;
  if (isNaN(g)) return;
  const newAvg = ((87 * 90 + g * w) / (90 + w)).toFixed(1);
  document.getElementById('whatif-result').textContent = `Projected average: ${newAvg}% (${newAvg >= 90 ? 'A' : newAvg >= 80 ? 'B' : newAvg >= 70 ? 'C' : 'D'})`;
}

// HALL PASS
let passTimerInterval = null, passTotal = 300, passRemaining = 300, selectedDest = '', selectedDuration = 5;
function selectDest(el, dest, icon, mins) {
  document.querySelectorAll('.dest-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedDest = icon + ' ' + dest;
  selectedDuration = mins;
  document.getElementById('pass-dest-label').textContent = `${dest} (${mins} min)`;
  document.getElementById('pass-selected').style.display = '';
}
function requestPass() {
  const passId = 'CF-' + Date.now().toString().slice(-6);
  passTotal = selectedDuration * 60; passRemaining = passTotal;
  document.getElementById('active-pass-id').textContent = 'PASS ID: ' + passId;
  document.getElementById('active-pass-dest').textContent = selectedDest;
  document.getElementById('pass-timer-num').textContent = selectedDuration + ':00';
  document.getElementById('pass-request-view').style.display = 'none';
  document.getElementById('pass-active-view').style.display = '';
  passTimerInterval = setInterval(tickPass, 1000);
}
function tickPass() {
  passRemaining--;
  if (passRemaining <= 0) {
    clearInterval(passTimerInterval);
    document.getElementById('pass-timer-num').textContent = '0:00';
    document.getElementById('pass-status-badge').className = 'pass-status pass-red';
    document.getElementById('pass-status-badge').textContent = 'TIME UP';
    return;
  }
  const m = Math.floor(passRemaining/60), s = passRemaining % 60;
  document.getElementById('pass-timer-num').textContent = `${m}:${String(s).padStart(2,'0')}`;
  const pct = passRemaining / passTotal;
  document.getElementById('pass-ring').style.strokeDashoffset = 377 * (1 - pct);
  const badge = document.getElementById('pass-status-badge');
  if (pct > 0.5) { badge.className = 'pass-status pass-green'; badge.textContent = 'ON TIME'; }
  else if (pct > 0.2) { badge.className = 'pass-status pass-yellow'; badge.textContent = 'HURRY BACK'; }
  else { badge.className = 'pass-status pass-red'; badge.textContent = 'ALMOST OUT'; }
}
function endPass() {
  clearInterval(passTimerInterval);
  document.getElementById('pass-request-view').style.display = '';
  document.getElementById('pass-active-view').style.display = 'none';
  document.querySelectorAll('.dest-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('pass-selected').style.display = 'none';
}

// CLUBS
function openClub(name, emoji, role) {
  document.getElementById('clubs-list').style.display = 'none';
  document.getElementById('club-portal').style.display = '';
  document.getElementById('club-portal-name').textContent = name;
  document.getElementById('club-portal-emoji').textContent = emoji;
  document.getElementById('club-portal-role').textContent = role;
}
function closeClub() {
  document.getElementById('clubs-list').style.display = '';
  document.getElementById('club-portal').style.display = 'none';
}
function sendClubMsg() {
  const inp = document.getElementById('club-chat-input');
  const text = inp.value.trim(); if (!text) return;
  const div = document.createElement('div'); div.className = 'msg me';
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  document.getElementById('club-msgs').appendChild(div);
  div.scrollIntoView({behavior:'smooth'}); inp.value = '';
}

// LOST & FOUND
function addLF() {
  const name = document.getElementById('lf-name').value.trim();
  const loc = document.getElementById('lf-loc').value.trim();
  const status = document.getElementById('lf-status').value;
  if (!name) return;
  const div = document.createElement('div'); div.className = 'lf-item';
  div.innerHTML = `<div class="lf-badge ${status === 'Lost' ? 'lf-lost' : 'lf-found'}">${status.toUpperCase()}</div><div><div class="lf-name">${name}</div><div class="lf-details">${loc || 'Unknown'} • Just now</div></div>`;
  document.getElementById('lf-list').appendChild(div);
  document.getElementById('lf-name').value = ''; document.getElementById('lf-loc').value = '';
}

// DIRECTORY
function filterDir(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#dir-list .dir-item').forEach(item => {
    item.style.display = item.querySelector('.dir-name').textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// CHATS
function openChat(name) {
  document.getElementById('chat-list-view').style.display = 'none';
  document.getElementById('chat-window-view').style.display = '';
  document.getElementById('chat-window-title').textContent = name;
}
function closeChatView() {
  document.getElementById('chat-list-view').style.display = '';
  document.getElementById('chat-window-view').style.display = 'none';
}
function sendMsg() {
  const inp = document.getElementById('chat-msg-input');
  const text = inp.value.trim(); if (!text) return;
  const div = document.createElement('div'); div.className = 'msg me';
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  document.getElementById('chat-msgs').appendChild(div);
  div.scrollIntoView({behavior:'smooth'}); inp.value = '';
}
function createChat() {
  const name = document.getElementById('new-chat-name').value.trim(); if (!name) return;
  const div = document.createElement('div'); div.className = 'chat-item';
  div.innerHTML = `<div onclick="openChat('${name}')"><div class="chat-name">${name}</div><div class="chat-preview">No messages yet</div></div><div class="chat-meta"><div class="chat-time">Now</div><div class="chat-expires">14 days left</div></div>`;
  document.getElementById('chat-list').appendChild(div);
  document.getElementById('new-chat-name').value = '';
}

// STUDY GROUPS
function addSG() {
  const subj = document.getElementById('sg-subj').value.trim();
  const loc = document.getElementById('sg-loc').value.trim();
  if (!subj) return;
  const div = document.createElement('div'); div.className = 'sg-item'; div.style.marginTop = '8px';
  div.innerHTML = `<div class="sg-subject">${subj}</div><div class="sg-details">📍 ${loc || 'TBD'}</div><div class="sg-badges"><span class="sg-badge sg-open">OPEN</span><button class="join-btn" onclick="alert('Joined!')">Join</button></div>`;
  document.getElementById('sg-list').appendChild(div);
  document.getElementById('sg-subj').value = ''; document.getElementById('sg-loc').value = '';
}

// REMINDERS
function addReminder() {
  const text = document.getElementById('rem-text').value.trim();
  const date = document.getElementById('rem-date').value;
  if (!text) return;
  const days = date ? Math.ceil((new Date(date) - new Date()) / (1000*60*60*24)) : 0;
  const label = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : date ? `${days} days` : 'No date';
  const div = document.createElement('div'); div.className = 'reminder-item';
  div.innerHTML = `<span>🔔</span><div class="reminder-text">${text}</div><div class="reminder-date">${label}</div><button class="del-btn" onclick="this.closest('.reminder-item').remove()">×</button>`;
  document.getElementById('rem-list').appendChild(div);
  document.getElementById('rem-text').value = ''; document.getElementById('rem-date').value = '';
}

// CARPOOL
function addCarpool() {
  const area = document.getElementById('cp-area').value.trim();
  const contact = document.getElementById('cp-contact').value.trim();
  const type = document.getElementById('cp-type').value;
  if (!area) return;
  const div = document.createElement('div'); div.className = 'carpool-item'; div.style.marginTop = '8px';
  div.innerHTML = `<span style="font-size:20px">${type.includes('Offering') ? '🚗' : '🙋'}</span><div><div style="font-size:14px;font-weight:600">${area}</div><div style="font-size:12px;color:var(--text-muted)">Contact: ${contact}</div></div>`;
  document.getElementById('cp-list').appendChild(div);
  document.getElementById('cp-area').value = ''; document.getElementById('cp-contact').value = '';
}

// POLLS
function vote(el) {
  if (el.dataset.voted) return;
  el.dataset.voted = '1';
  el.style.opacity = '0.7';
  alert('Vote recorded!');
}

// PROFILE
function selectAvatar(el, gradient) {
  document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('main-avatar').style.background = gradient;
}
function saveProfile() {
  const name = document.getElementById('display-name-input').value.trim();
  const grade = document.getElementById('grade-input').value;
  const id = document.getElementById('student-id-input').value.trim();
  if (!name) return;
  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('id-name-display').textContent = name;
  document.getElementById('id-grade-display').textContent = grade;
  document.getElementById('id-num-display').textContent = `ID: ${id}`;
  document.getElementById('user-chip').textContent = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('main-avatar').textContent = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  alert('Profile saved!');
}

// ADMIN
function addTeacher() {
  const email = document.getElementById('teacher-email-input').value.trim(); if (!email) return;
  const div = document.createElement('div'); div.className = 'deadline-item';
  div.innerHTML = `<div class="dl-dot" style="background:var(--success)"></div><div style="flex:1"><div class="dl-name">${email}</div></div><button class="del-btn" onclick="this.closest('.deadline-item').remove()">×</button>`;
  document.getElementById('teacher-list').appendChild(div);
  document.getElementById('teacher-email-input').value = '';
}
function postAnnouncement() {
  const t = document.getElementById('ann-title-input').value.trim(); if (!t) return;
  alert(`Announcement "${t}" posted!`);
  document.getElementById('ann-title-input').value = '';
  document.getElementById('ann-body-input').value = '';
}
function addSport() {
  const sport = document.getElementById('sport-type').value;
  const opp = document.getElementById('sport-opp').value.trim();
  const us = document.getElementById('sport-us').value;
  const them = document.getElementById('sport-them').value;
  if (!opp || !us || !them) return;
  const result = parseInt(us) > parseInt(them) ? 'WIN' : parseInt(us) < parseInt(them) ? 'LOSS' : 'TIE';
  alert(`${sport} result added: CF Panthers ${us} — ${opp} ${them} (${result})`);
}
function savePeriod(num, val) { try { localStorage.setItem('period' + num, val); } catch(e) {} }
