// ScholarSync v15 - build 1782698034
// ============================================================
// SCHOLARSYNC — app.js (Firebase Compat — Full Real Time)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAOMVE_pPbe7JIMwLcjgHMriMlT9wEuU-o",
  authDomain: "scholarsync-da2fd.firebaseapp.com",
  projectId: "scholarsync-da2fd",
  storageBucket: "scholarsync-da2fd.firebasestorage.app",
  messagingSenderId: "700534317822",
  appId: "1:700534317822:web:1ad5cc8b20c82b1f2c7baf"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const FS = firebase.firestore.FieldValue;

// ---- ICONS ----
const ICONS = {
  pin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  warn:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><polyline points="20,6 9,17 4,12"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15" style="vertical-align:middle;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
  car:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  hand:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="26" height="26"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M6 14c0 4 3 6 6 6s6-2 6-6v-4"/></svg>`,
};

// ---- STATE ----
let currentUser = null;
let currentUserData = null;
let currentClass = null;
let currentClub = null;
let currentChat = null;
let chatMembers = [];
let activePassId = null;
let passTimerInterval = null;
let passTotal = 0;
let passRemaining = 0;
let timerInterval = null;
let timerSecs = 25*60;
let timerRunning = false;
let timerMode = 25;
let timerSessions = 0;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedDest = '';
let selectedDestMins = 5;
let currentDeck = 'all';
let unsubscribers = [];
let selectedCalDate = '';

const PERIODS = [
  {name:'Arrival',start:[7,45],end:[8,20]},
  {name:'1st Block',start:[8,20],end:[9,50]},
  {name:'2nd Block',start:[9,57],end:[11,27]},
  {name:'Lunch',start:[11,34],end:[12,8]},
  {name:'3rd Block',start:[12,13],end:[13,43]},
  {name:'4th Block',start:[13,50],end:[15,20]},
];

const HOLIDAYS = [
  {date:'2026-09-07',title:'Labor Day',type:'holiday'},
  {date:'2026-11-26',title:'Thanksgiving',type:'holiday'},
  {date:'2026-12-25',title:'Christmas Day',type:'holiday'},
  {date:'2027-01-01',title:'New Years Day',type:'holiday'},
  {date:'2027-01-18',title:'MLK Day',type:'holiday'},
  {date:'2027-05-31',title:'Memorial Day',type:'holiday'},
  {date:'2027-06-04',title:'Last Day of School',type:'dayoff'},
];

// ---- HELPERS ----
function ls(key,val){if(val===undefined){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}localStorage.setItem(key,JSON.stringify(val));}
function lsArr(key){return ls(key)||[];}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function genPassId(){return 'HP'+Math.floor(100000+Math.random()*900000);}
function pad(n){return String(n).padStart(2,'0');}

// ---- DATE DIFF FIX (timezone safe) ----
function daysDiff(dateStr){
  // Parse date as local midnight to avoid timezone off-by-one
  const parts = dateStr.split('-');
  const target = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

// ---- AUTH ----
function switchAuth(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector(`[onclick="switchAuth('${tab}')"]`).classList.add('active');
  document.getElementById('signin-form').style.display=tab==='signin'?'':'none';
  document.getElementById('signup-form').style.display=tab==='signup'?'':'none';
  document.getElementById('auth-error').style.display='none';
}
function showAuthError(msg){const el=document.getElementById('auth-error');el.textContent=msg;el.style.display='';}

function signIn(){
  const email=document.getElementById('si-email').value.trim();
  const pass=document.getElementById('si-password').value;
  const remember=document.getElementById('si-remember')?.checked;
  if(!email||!pass)return showAuthError('Please fill in all fields.');
  const persistence=remember
    ?firebase.auth.Auth.Persistence.LOCAL
    :firebase.auth.Auth.Persistence.SESSION;
  auth.setPersistence(persistence).then(()=>{
    return auth.signInWithEmailAndPassword(email,pass);
  }).catch(e=>{
    const msgs={'auth/user-not-found':'No account found.','auth/wrong-password':'Wrong password.','auth/invalid-credential':'Invalid email or password.','auth/too-many-requests':'Too many attempts. Try later.'};
    showAuthError(msgs[e.code]||'Sign in failed. Try again.');
  });
}

async function signUp(){
  const name=document.getElementById('su-name').value.trim();
  const email=document.getElementById('su-email').value.trim();
  const pass=document.getElementById('su-password').value;
  const school=document.getElementById('su-school').value;
  const grade=document.getElementById('su-grade').value;
  if(!name||!email||!pass||!school||!grade)return showAuthError('Please fill in all fields.');
  if(pass.length<6)return showAuthError('Password must be at least 6 characters.');
  try{
    // Set persistence so they stay logged in
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    const uid=cred.user.uid;
    const isFounder=email==='mykahsheppard@g.horrycountyschools.net';
    const schoolSnap=await db.collection('users').where('school','==',school).limit(1).get();
    const isFirstFromSchool=schoolSnap.empty;
    const rolesSnap=await db.collection('schoolRoles').doc(school).get();
    const rolesData=rolesSnap.exists?rolesSnap.data():{};
    const grantedTeachers=rolesData.teachers||[];
    const grantedAdmins=rolesData.admins||[];
    const isGrantedTeacher=grantedTeachers.includes(email.toLowerCase());
    const isGrantedAdmin=grantedAdmins.includes(email.toLowerCase());
    const isAdmin=isFirstFromSchool||isFounder||isGrantedAdmin;
    const isTeacher=isAdmin||isGrantedTeacher;
    const userData={uid,name,email,school,grade,role:isTeacher?'teacher':'student',isAdmin,isTeacher,avatar:'linear-gradient(135deg,#1a56db,#3b82f6)',createdAt:FS.serverTimestamp()};
    await db.collection('users').doc(uid).set(userData);
    if(isFirstFromSchool||isFounder){await db.collection('schoolRoles').doc(school).set({admins:[email.toLowerCase()],teachers:[]},{merge:true});}
    // onAuthStateChanged will auto launch the app — no redirect needed
  }catch(e){
    const msgs={'auth/email-already-in-use':'Account already exists.','auth/weak-password':'Password too short.','auth/invalid-email':'Invalid email.'};
    showAuthError(msgs[e.code]||'Sign up failed. Try again.');
  }
}

async function signOut(){
  const footer=document.getElementById('app-footer');
  if(footer)footer.style.display='none';
  unsubscribers.forEach(u=>u());unsubscribers=[];
  await auth.signOut();
  currentUser=null;currentUserData=null;
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
}

async function showForgot(){
  const email=prompt('Enter your email to reset your password:');
  if(!email)return;
  try{await auth.sendPasswordResetEmail(email);alert('Reset email sent! Check your inbox.');}
  catch{alert('Could not send reset email.');}
}

// ---- AUTH LISTENER ----
auth.onAuthStateChanged(async user=>{
  if(user){
    currentUser=user;
    const snap=await db.collection('users').doc(user.uid).get();
    if(snap.exists){
      currentUserData=snap.data();
      document.getElementById('auth-screen').style.display='none';
      document.getElementById('app').style.display='';
      launchApp();
    }
  }else{
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('app').style.display='none';
  }
});

// ---- LAUNCH ----
function launchApp(){
  const footer=document.getElementById('app-footer');
  if(footer)footer.style.display='';
  setupUI();startClock();renderSchedule();renderID();loadWeather();
  renderHomework();renderDeadlines();renderExams();renderFlashcards();renderAbsences();
  renderCalendar();renderAnnouncements();renderClassrooms();renderClubs();
  renderSports();renderPolls();renderDirectory();renderLostFound();
  renderCarpool();renderChats();renderStudyGroups();renderReminders();renderProfile();
  nav('today');
}

function setupUI(){
  const u=currentUserData;
  document.getElementById('sidebar-name').textContent=u.name;
  document.getElementById('sidebar-email').textContent=u.email;
  document.getElementById('sidebar-school').textContent=u.school;
  document.getElementById('info-email').textContent=u.email;
  document.getElementById('info-school').textContent=u.school;
  document.getElementById('info-role').textContent=u.role+(u.isAdmin?' (Admin)':'');
  document.getElementById('info-grade').textContent=u.grade;
  document.getElementById('profile-name-input').value=u.name;
  const av=document.getElementById('sidebar-avatar');
  av.textContent=u.name[0].toUpperCase();av.style.background=u.avatar||'linear-gradient(135deg,#1a56db,#3b82f6)';
  if(u.isAdmin){document.querySelectorAll('.admin-only').forEach(el=>el.style.display='');document.getElementById('admin-panel').style.display='';}
  if(u.isTeacher||u.isAdmin){document.querySelectorAll('.teacher-only').forEach(el=>el.style.display='');document.getElementById('teacher-panel-btn').style.display='';}
  const savedTheme=ls('ss_theme');
  if(savedTheme==='light'){document.body.classList.add('light-mode');document.getElementById('theme-label').textContent='Dark Mode';}
  renderApprovedTeachers();renderApprovedAdmins();
}

// ---- NAV ----
function nav(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const p=document.getElementById('page-'+page);if(p)p.classList.add('active');
  const btn=document.querySelector(`[onclick="nav('${page}')"]`);if(btn)btn.classList.add('active');
  closeSidebar();
  // Staff chat listeners
  if(page==='adminchat'&&currentUserData?.isAdmin)listenAdminChat();
  if(page==='teacherchat'&&(currentUserData?.isTeacher||currentUserData?.isAdmin))listenTeacherChat();
  if(page==='teacherpanel'&&(currentUserData?.isTeacher||currentUserData?.isAdmin))renderTPPanels();
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.querySelector('.sidebar-overlay').classList.toggle('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.querySelector('.sidebar-overlay').classList.remove('open');}
function toggleTheme(){const light=document.body.classList.toggle('light-mode');document.getElementById('theme-label').textContent=light?'Dark Mode':'Light Mode';ls('ss_theme',light?'light':'dark');}

// ---- CLOCK ----
function startClock(){updateClock();setInterval(updateClock,1000);}
function updateClock(){
  const now=new Date(),h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const ampm=h>=12?'PM':'AM',hh=h%12||12;
  document.getElementById('clock').textContent=`${hh}:${pad(m)}:${pad(s)} ${ampm}`;
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('clock-date').textContent=`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  updatePeriod(h,m);
}
function updatePeriod(h,m){
  const totalMins=h*60+m;let cur=null;
  for(const p of PERIODS){const start=p.start[0]*60+p.start[1],end=p.end[0]*60+p.end[1];if(totalMins>=start&&totalMins<end){cur={...p,start,end};break;}}
  ['period-name','sched-period'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=cur?cur.name:'No class';});
  if(cur){
    const left=cur.end-totalMins,pct=((totalMins-cur.start)/(cur.end-cur.start)*100).toFixed(1);
    ['period-time','sched-time'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=`${Math.floor(left/60)}:${pad(left%60)}`;});
    ['period-progress','sched-progress'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.width=pct+'%';});
  }
}

// ---- SCHEDULE ----
function renderSchedule(){
  const saved=ls('ss_schedule')||{};const body=document.getElementById('schedule-body');body.innerHTML='';
  PERIODS.forEach((p,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${p.name}</td><td>${pad(p.start[0])}:${pad(p.start[1])} – ${pad(p.end[0])}:${pad(p.end[1])}</td><td><input class="input" style="margin:0;padding:6px 10px;" placeholder="Your class name..." value="${saved['period'+i]||''}" oninput="tempSavePeriod(${i},this.value)"></td>`;body.appendChild(tr);});
  populateClassDropdowns();
}
function tempSavePeriod(i,val){const saved=ls('ss_schedule')||{};saved['period'+i]=val;ls('ss_schedule',saved);populateClassDropdowns();}
function saveSchedule(){alert('Schedule saved!');populateClassDropdowns();}
function populateClassDropdowns(){
  const saved=ls('ss_schedule')||{};const classes=Object.values(saved).filter(Boolean);
  ['hw-task-class','dl-class','notes-class-select'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const cur=el.value;el.innerHTML='<option value="">Select class...</option>';classes.forEach(c=>{const opt=document.createElement('option');opt.value=c;opt.textContent=c;el.appendChild(opt);});if(cur)el.value=cur;});
}

// ---- STUDENT ID ----
function renderID(){
  const idData=ls('ss_idCard')||{};
  document.getElementById('id-name').textContent=currentUserData.name;
  document.getElementById('id-school-label').textContent=currentUserData.school;
  document.getElementById('id-grade-display').textContent=idData.grade||currentUserData.grade||'—';
  document.getElementById('id-num-display').textContent=idData.idNumber||'—';
  document.getElementById('id-grade-input').value=idData.grade||'';
  document.getElementById('id-num-input').value=idData.idNumber||'';
  const av=document.getElementById('id-avatar');av.textContent=currentUserData.name[0].toUpperCase();av.style.background=currentUserData.avatar;
  const bc=document.getElementById('id-barcode');bc.innerHTML='';
  for(let i=0;i<50;i++){const s=document.createElement('span');s.style.cssText=`width:${[1,1,2,2,1,3][Math.floor(Math.random()*6)]}px;height:${16+Math.random()*16}px;display:inline-block;`;bc.appendChild(s);}
}
function saveID(){const grade=document.getElementById('id-grade-input').value;const idNumber=document.getElementById('id-num-input').value.trim();ls('ss_idCard',{grade,idNumber});document.getElementById('id-grade-display').textContent=grade||'—';document.getElementById('id-num-display').textContent=idNumber||'—';alert('ID saved!');}

// ---- WEATHER ----
async function loadWeather(){
  const card=document.getElementById('weather-card');card.innerHTML='<div class="weather-loading">Loading weather...</div>';
  try{
    const res=await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.6890&longitude=-78.8867&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m&timezone=America/New_York&forecast_days=1');
    const data=await res.json();const cw=data.current_weather;
    const tempF=Math.round(cw.temperature*9/5+32);
    const feelsF=Math.round((data.hourly.apparent_temperature[0]||cw.temperature)*9/5+32);
    const humidity=data.hourly.relativehumidity_2m[0]||'—';
    const wind=Math.round((data.hourly.windspeed_10m[0]||cw.windspeed)*0.621371);
    const code=cw.weathercode;
    let cond='☀ Clear';
    if(code>=1&&code<=3)cond='⛅ Partly Cloudy';
    if(code>=51&&code<=67)cond='🌧 Rain';
    if(code>=71&&code<=77)cond='❄ Snow';
    if(code>=80&&code<=82)cond='🌦 Showers';
    if(code>=95)cond='⛈ Storm';
    card.innerHTML=`<div><div class="weather-big-temp">${tempF}°F</div><div class="weather-condition">${cond}</div><div style="font-size:13px;color:var(--gray)">📍 Myrtle Beach, SC</div></div><div class="weather-details-grid"><div class="weather-detail-card"><div class="weather-detail-val">${feelsF}°</div><div class="weather-detail-label">Feels Like</div></div><div class="weather-detail-card"><div class="weather-detail-val">${humidity}%</div><div class="weather-detail-label">Humidity</div></div><div class="weather-detail-card"><div class="weather-detail-val">${wind}</div><div class="weather-detail-label">Wind mph</div></div></div>`;
  }catch{card.innerHTML='<div class="weather-loading">Could not load weather.</div>';}
}

// ---- HOMEWORK ----
function renderHomework(){
  const uid=currentUser.uid;const items=lsArr('ss_homework_'+uid);
  const pending=items.filter(i=>!i.done),done=items.filter(i=>i.done);
  document.getElementById('hw-pending').innerHTML=pending.length?pending.map(hwHTML).join(''):'<div class="empty-state">No pending tasks 🎉</div>';
  document.getElementById('hw-done').innerHTML=done.length?done.map(hwHTML).join(''):'<div class="empty-state">Nothing completed yet</div>';
  const todayHW=document.getElementById('today-hw-list');
  if(todayHW)todayHW.innerHTML=pending.length?pending.slice(0,3).map(i=>`<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div></div>`).join(''):'<div class="empty-state">No homework due today 🎉</div>';
}
function hwHTML(i){return `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'✓':''}</div><div style="flex:1"><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div><button class="btn-ghost btn-sm" onclick="deleteHW('${i.id}')">×</button></div>`;}
function addHW(){const text=document.getElementById('hw-task-name').value.trim();const cls=document.getElementById('hw-task-class').value;if(!text)return;const items=lsArr('ss_homework_'+currentUser.uid);items.unshift({id:genId(),text,cls,done:false});ls('ss_homework_'+currentUser.uid,items);renderHomework();closeAllModals();document.getElementById('hw-task-name').value='';}
function toggleHW(id){const items=lsArr('ss_homework_'+currentUser.uid);const item=items.find(i=>i.id===id);if(item)item.done=!item.done;ls('ss_homework_'+currentUser.uid,items);renderHomework();}
function deleteHW(id){ls('ss_homework_'+currentUser.uid,lsArr('ss_homework_'+currentUser.uid).filter(i=>i.id!==id));renderHomework();}

// ---- NOTES ----
function saveNote(){const cls=document.getElementById('notes-class-select').value;const text=document.getElementById('notes-editor').value.trim();if(!cls||!text)return alert('Select a class and write notes first!');const notes=lsArr('ss_notes_'+currentUser.uid);const ex=notes.find(n=>n.cls===cls);if(ex)ex.text=text;else notes.push({id:genId(),cls,text});ls('ss_notes_'+currentUser.uid,notes);renderNotesList();alert('Note saved!');}
function renderNotesList(){const notes=lsArr('ss_notes_'+currentUser.uid);document.getElementById('notes-list').innerHTML=notes.length?notes.map(n=>`<div class="note-item" onclick="loadNoteItem('${n.id}')"><div class="note-item-class">${n.cls}</div>${n.text.slice(0,60)}...</div>`).join(''):'<div class="empty-state">No notes saved</div>';}
function loadNote(){const cls=document.getElementById('notes-class-select').value;const notes=lsArr('ss_notes_'+currentUser.uid);const found=notes.find(n=>n.cls===cls);document.getElementById('notes-editor').value=found?found.text:'';}
function loadNoteItem(id){const notes=lsArr('ss_notes_'+currentUser.uid);const note=notes.find(n=>n.id===id);if(note){document.getElementById('notes-class-select').value=note.cls;document.getElementById('notes-editor').value=note.text;}}

// ---- DEADLINES (fixed date calc) ----
function renderDeadlines(){
  const items=lsArr('ss_deadlines_'+currentUser.uid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  document.getElementById('dl-list').innerHTML=items.length?items.map(dl=>{
    const days=daysDiff(dl.date);
    const cls=days<0?'dl-red':days<=3?'dl-red':days<=7?'dl-gold':'dl-blue';
    const label=days<0?'PAST DUE':days===0?'TODAY':days===1?'TOMORROW':`${days} days`;
    return`<div class="deadline-card"><div class="deadline-days ${cls}">${label}</div><div class="deadline-info"><div class="deadline-name">${dl.name}</div><div class="deadline-meta">${dl.cls} • ${dl.type} • ${dl.date}</div></div><button class="btn-ghost btn-sm" onclick="deleteDeadline('${dl.id}')">×</button></div>`;
  }).join(''):'<div class="empty-state">No deadlines yet</div>';
  renderDashDeadlines();
}
function addDeadline(){const name=document.getElementById('dl-name').value.trim();const cls=document.getElementById('dl-class').value;const type=document.getElementById('dl-type').value;const date=document.getElementById('dl-date').value;if(!name||!date)return;const items=lsArr('ss_deadlines_'+currentUser.uid);items.push({id:genId(),name,cls,type,date});ls('ss_deadlines_'+currentUser.uid,items);renderDeadlines();closeAllModals();document.getElementById('dl-name').value='';document.getElementById('dl-date').value='';}
function deleteDeadline(id){ls('ss_deadlines_'+currentUser.uid,lsArr('ss_deadlines_'+currentUser.uid).filter(i=>i.id!==id));renderDeadlines();}
function renderDashDeadlines(){
  const items=lsArr('ss_deadlines_'+currentUser.uid).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5);
  const el=document.getElementById('dash-deadlines');if(!el)return;
  el.innerHTML=items.length?items.map(dl=>{const days=daysDiff(dl.date);const cls=days<=3?'dl-red':days<=7?'dl-gold':'dl-blue';return`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${dl.name}</span><span class="${cls}" style="font-weight:700">${days<0?'PAST':days===0?'TODAY':days+'d'}</span></div>`;}).join(''):'<div class="empty-state">No upcoming deadlines</div>';
  document.getElementById('stat-due').textContent=items.filter(d=>{const days=daysDiff(d.date);return days>=0&&days<=7;}).length;
}

// ---- EXAMS (fixed date calc) ----
function renderExams(){
  const items=lsArr('ss_exams_'+currentUser.uid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  document.getElementById('exam-list').innerHTML=items.length?items.map(ex=>{
    const days=daysDiff(ex.date);
    const color=days<=3?'#ef4444':days<=7?'#f59e0b':'#3b82f6';
    const label=days<0?'PAST':days===0?'TODAY!':String(days);
    return`<div class="exam-card"><div class="exam-days" style="color:${color}">${label}</div><div style="font-size:11px;color:var(--gray);">${days>0?'DAYS LEFT':''}</div><div class="exam-name">${ex.name}</div><div class="exam-subject">${ex.subject}</div><div class="exam-date">${ex.date}</div><button class="btn-ghost btn-sm" style="margin-top:10px;width:100%;" onclick="deleteExam('${ex.id}')">Delete</button></div>`;
  }).join(''):'<div class="empty-state">No exams yet</div>';
}
function addExam(){const name=document.getElementById('exam-name').value.trim();const subject=document.getElementById('exam-subject').value.trim();const date=document.getElementById('exam-date').value;if(!name||!date)return;const items=lsArr('ss_exams_'+currentUser.uid);items.push({id:genId(),name,subject,date});ls('ss_exams_'+currentUser.uid,items);renderExams();closeAllModals();}
function deleteExam(id){ls('ss_exams_'+currentUser.uid,lsArr('ss_exams_'+currentUser.uid).filter(i=>i.id!==id));renderExams();}

// ---- STUDY TIMER ----
function setTimerMode(mins,label,el){document.querySelectorAll('.timer-mode-row .btn-ghost').forEach(b=>b.classList.remove('active-mode'));el.classList.add('active-mode');timerMode=mins;timerSecs=mins*60;timerRunning=false;clearInterval(timerInterval);document.getElementById('timer-display').textContent=`${pad(mins)}:00`;document.getElementById('timer-label').textContent=label+' Session';document.getElementById('timer-start-btn').textContent='Start';}
function toggleTimer(){if(timerRunning){clearInterval(timerInterval);timerRunning=false;document.getElementById('timer-start-btn').textContent='Resume';}else{timerRunning=true;document.getElementById('timer-start-btn').textContent='Pause';timerInterval=setInterval(()=>{if(timerSecs<=0){clearInterval(timerInterval);timerRunning=false;timerSessions++;document.getElementById('timer-sessions').textContent=timerSessions+1;document.getElementById('timer-start-btn').textContent='Start';timerSecs=timerMode*60;document.getElementById('timer-display').textContent=`${pad(timerMode)}:00`;return;}timerSecs--;document.getElementById('timer-display').textContent=`${pad(Math.floor(timerSecs/60))}:${pad(timerSecs%60)}`;},1000);}}
function resetTimer(){clearInterval(timerInterval);timerRunning=false;timerSecs=timerMode*60;document.getElementById('timer-display').textContent=`${pad(timerMode)}:00`;document.getElementById('timer-start-btn').textContent='Start';}

// ---- FLASHCARDS ----
function renderFlashcards(){
  const cards=lsArr('ss_flashcards_'+currentUser.uid);
  const decks=[...new Set(cards.map(c=>c.deck))];
  document.getElementById('deck-tabs').innerHTML=
    `<button class="deck-tab${currentDeck==='all'?' active':''}" onclick="filterDeck('all')">All</button>`+
    decks.map(d=>`<div style="display:inline-flex;align-items:center;gap:2px;margin-right:4px;">
      <button class="deck-tab${currentDeck===d?' active':''}" onclick="filterDeck('${d}')">${d}</button>
      <button onclick="deleteDeck('${d}')" style="background:rgba(239,68,68,.15);border:none;color:#ef4444;border-radius:6px;padding:4px 7px;font-size:11px;cursor:pointer;font-weight:700;" title="Delete deck">×</button>
    </div>`).join('');
  const filtered=currentDeck==='all'?cards:cards.filter(c=>c.deck===currentDeck);
  document.getElementById('fc-grid').innerHTML=filtered.length?filtered.map(c=>`
    <div style="position:relative;">
      <div class="fc-card" onclick="this.classList.toggle('flipped')">
        <div class="fc-inner">
          <div class="fc-front-face"><div><div class="fc-deck-label">${c.deck}</div>${c.front}</div></div>
          <div class="fc-back-face">${c.back}</div>
        </div>
      </div>
      <button onclick="deleteFlashcard('${c.id}')" style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,.8);border:none;color:white;border-radius:50%;width:22px;height:22px;font-size:13px;cursor:pointer;line-height:1;z-index:10;" title="Delete card">×</button>
    </div>`).join(''):'<div class="empty-state">No flashcards yet</div>';
}
function filterDeck(deck){currentDeck=deck;renderFlashcards();}
function addFlashcard(){
  const deck=document.getElementById('fc-deck').value.trim();
  const front=document.getElementById('fc-front').value.trim();
  const back=document.getElementById('fc-back').value.trim();
  if(!deck||!front||!back)return;
  const cards=lsArr('ss_flashcards_'+currentUser.uid);
  cards.push({id:genId(),deck,front,back});
  ls('ss_flashcards_'+currentUser.uid,cards);
  renderFlashcards();closeAllModals();
  ['fc-deck','fc-front','fc-back'].forEach(id=>document.getElementById(id).value='');
}
function deleteFlashcard(id){
  if(!confirm('Delete this flashcard?'))return;
  ls('ss_flashcards_'+currentUser.uid,lsArr('ss_flashcards_'+currentUser.uid).filter(c=>c.id!==id));
  renderFlashcards();
}
function deleteDeck(deck){
  if(!confirm(`Delete the entire "${deck}" deck? This removes all cards in it.`))return;
  ls('ss_flashcards_'+currentUser.uid,lsArr('ss_flashcards_'+currentUser.uid).filter(c=>c.deck!==deck));
  if(currentDeck===deck)currentDeck='all';
  renderFlashcards();
}

// ---- ABSENCES ----
function renderAbsences(){
  const items=lsArr('ss_absences_'+currentUser.uid);
  const unex=items.filter(i=>i.type==='Unexcused').length;
  const ex=items.filter(i=>['Parent Excused','Medical','College Visit'].includes(i.type)).length;
  const tard=items.filter(i=>i.type==='Tardy').length;
  document.getElementById('abs-total').textContent=items.length;document.getElementById('abs-unex').textContent=unex;document.getElementById('abs-ex').textContent=ex;document.getElementById('abs-tard').textContent=tard;document.getElementById('stat-abs').textContent=unex;
  const warnings=document.getElementById('abs-warnings');warnings.innerHTML='';
  if(unex>=3)warnings.innerHTML+=`<div class="abs-warning">${ICONS.warn} ${unex} unexcused absences — AIP risk!</div>`;
  if(tard>=3)warnings.innerHTML+=`<div class="abs-warning">${ICONS.warn} ${tard} tardies = ${Math.floor(tard/3)} unexcused absence(s)</div>`;
  document.getElementById('abs-log').innerHTML=items.length?items.map(i=>{const bc=i.type==='Unexcused'?'badge-unex':i.type==='Tardy'?'badge-tardy':'badge-excused';return`<div class="abs-log-item"><span class="abs-type-badge ${bc}">${i.type}</span><span>${i.date}</span><span style="color:var(--gray)">${i.cls}</span><button class="btn-ghost btn-sm" onclick="deleteAbsence('${i.id}')">×</button></div>`;}).join(''):'<div class="empty-state">No absences logged</div>';
}
function logAbsence(){const date=document.getElementById('abs-date').value;const type=document.getElementById('abs-type').value;const cls=document.getElementById('abs-class').value.trim();if(!date)return;const items=lsArr('ss_absences_'+currentUser.uid);items.unshift({id:genId(),date,type,cls});ls('ss_absences_'+currentUser.uid,items);renderAbsences();closeAllModals();}
function deleteAbsence(id){ls('ss_absences_'+currentUser.uid,lsArr('ss_absences_'+currentUser.uid).filter(i=>i.id!==id));renderAbsences();}

// ---- CALENDAR (real time + titles on dots) ----
function renderCalendar(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent=`${months[calMonth]} ${calYear}`;
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{const el=document.createElement('div');el.className='cal-day-label';el.textContent=d;grid.appendChild(el);});
  const first=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const today=new Date();today.setHours(0,0,0,0);
  const events=lsArr('ss_calEvents_'+currentUser.uid);
  for(let i=0;i<first;i++){const div=document.createElement('div');div.className='cal-day other-month';div.textContent=new Date(calYear,calMonth,1-first+i).getDate();grid.appendChild(div);}
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const div=document.createElement('div');div.className='cal-day';
    const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
    if(isToday)div.classList.add('today');
    const dayEvents=[...events.filter(e=>e.date===dateStr),...HOLIDAYS.filter(h=>h.date===dateStr)];
    // Show day number
    const dayNum=document.createElement('div');dayNum.textContent=d;dayNum.style.cssText='font-size:13px;line-height:1;';div.appendChild(dayNum);
    if(dayEvents.length){
      // Show first event title instead of just a dot
      const colors={personal:'#3b82f6',reminder:'#f59e0b',deadline:'#ef4444',school:'#1a56db',holiday:'#f59e0b',dayoff:'#22c55e'};
      const firstEvent=dayEvents[0];
      const label=document.createElement('div');
      label.style.cssText=`font-size:8px;color:${colors[firstEvent.type]||'#3b82f6'};font-weight:600;line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;`;
      label.textContent=firstEvent.title||(firstEvent.type==='holiday'?'Holiday':firstEvent.type);
      div.appendChild(label);
      if(dayEvents.length>1){const more=document.createElement('div');more.style.cssText='font-size:7px;color:var(--gray);';more.textContent=`+${dayEvents.length-1} more`;div.appendChild(more);}
    }
    div.onclick=()=>openCalDay(dateStr,months[calMonth]+' '+d);
    grid.appendChild(div);
  }
}
function changeMonth(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function openCalDay(date,label){
  selectedCalDate=date;
  document.getElementById('cal-modal-title').textContent=`Events for ${label}`;
  const events=lsArr('ss_calEvents_'+currentUser.uid).filter(e=>e.date===date);
  const holidays=HOLIDAYS.filter(h=>h.date===date);
  const all=[...holidays,...events];
  document.getElementById('cal-modal-events').innerHTML=all.length?all.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e.title||e.type}</span>${e.uid===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteCalEvent('${e.id}')">×</button>`:''}</div>`).join(''):'<div class="empty-state" style="padding:8px 0;">No events</div>';
  openModal('cal-modal');
}
function addCalEvent(){const title=document.getElementById('cal-event-title').value.trim();const type=document.getElementById('cal-event-type').value;if(!title)return;if(type==='school'&&!currentUserData.isAdmin)return alert('Only admins can post school events.');const events=lsArr('ss_calEvents_'+currentUser.uid);events.push({id:genId(),date:selectedCalDate,title,type,uid:currentUser.uid});ls('ss_calEvents_'+currentUser.uid,events);renderCalendar();closeAllModals();document.getElementById('cal-event-title').value='';}
function deleteCalEvent(id){ls('ss_calEvents_'+currentUser.uid,lsArr('ss_calEvents_'+currentUser.uid).filter(e=>e.id!==id));renderCalendar();closeAllModals();}

// ---- ANNOUNCEMENTS (real time) ----
function renderAnnouncements(){
  const unsub=db.collection('announcements')
    .where('school','==',currentUserData.school)
    .onSnapshot(snap=>{
      const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
      document.getElementById('ann-list').innerHTML=items.length?items.map(a=>`<div class="ann-card"><div class="ann-title">${a.title}</div><div class="ann-body">${a.body}</div><div class="ann-meta"><span>${ICONS.pin} ${a.postedByName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Just now'}</span>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteAnnouncement('${a.id}')">Delete</button>`:''}</div></div>`).join(''):'<div class="empty-state">No announcements yet</div>';
      const latest=items[0];const todayAnn=document.getElementById('today-ann');
      if(todayAnn)todayAnn.innerHTML=latest?`<div style="font-size:14px;font-weight:600;margin-bottom:4px;">${latest.title}</div><div style="font-size:12px;color:var(--gray)">${latest.body.slice(0,100)}...</div>`:'<div class="empty-state">No announcements yet</div>';
    },err=>console.error('Announcements error:',err));
  unsubscribers.push(unsub);
}
async function postAnnouncement(){
  if(!currentUserData.isAdmin)return;
  const title=document.getElementById('ann-title').value.trim();
  const body=document.getElementById('ann-body').value.trim();
  if(!title||!body)return alert('Please fill in title and body.');
  try{
    await db.collection('announcements').add({title,body,postedBy:currentUser.uid,postedByName:currentUserData.name,school:currentUserData.school,createdAt:FS.serverTimestamp()});
    closeAllModals();document.getElementById('ann-title').value='';document.getElementById('ann-body').value='';
  }catch(e){alert('Error posting: '+e.message);}
}
async function deleteAnnouncement(id){await db.collection('announcements').doc(id).delete();}

// ---- CLASSROOMS (real time) ----
function renderClassrooms(){
  const uid=currentUser.uid;const school=currentUserData.school;
  const isTeacherOrAdmin=currentUserData.isTeacher||currentUserData.isAdmin;
  const q=isTeacherOrAdmin
    ?db.collection('classrooms').where('school','==',school).where('teacherUid','==',uid)
    :db.collection('classrooms').where('school','==',school).where('students','array-contains',uid);
  const unsub=q.onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('classroom-list').innerHTML=items.length?items.map(c=>`<div class="class-card" onclick="openClassroom('${c.id}')"><div class="class-banner" style="background:${c.color}"></div><div class="class-card-body"><div class="class-card-name">${c.name}</div><div class="class-card-teacher">${c.teacherName} • ${c.subject}</div><div class="class-card-code" style="margin-top:8px;">CODE: ${c.code}</div></div></div>`).join(''):'<div class="empty-state">No classes yet. Join a class with a code!</div>';
    document.getElementById('stat-classes').textContent=items.length;
    const dashEl=document.getElementById('dash-classrooms');if(dashEl)dashEl.innerHTML=items.length?items.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="nav('classroom')"><div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;"></div><span style="font-size:14px;flex:1;">${c.name}</span><span style="font-size:12px;color:var(--gray)">${c.subject}</span></div>`).join(''):'<div class="empty-state">No classes joined yet</div>';
  },err=>console.error('Classrooms:',err));
  unsubscribers.push(unsub);
}

async function openClassroom(id){
  const snap=await db.collection('classrooms').doc(id).get();
  if(!snap.exists)return;
  currentClass={id,...snap.data()};
  document.getElementById('cd-title').textContent=currentClass.name;
  document.getElementById('cd-sub').textContent=currentClass.teacherName+' • '+currentClass.subject;
  const isTeacher=(currentUserData.isTeacher||currentUserData.isAdmin)&&currentClass.teacherUid===currentUser.uid;
  document.querySelectorAll('.teacher-only').forEach(el=>el.style.display=isTeacher?'':'none');
  renderClassroomDetail();
  // Real time student list
  if(isTeacher){
    const sl=document.getElementById('cd-students-list');
    if(sl&&currentClass.students&&currentClass.students.length){
      const snaps=await Promise.all(currentClass.students.map(uid=>db.collection('users').doc(uid).get()));
      sl.innerHTML=snaps.filter(s=>s.exists).map(s=>{const u=s.data();return`<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div><div><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div></div>`;}).join('');
    }else if(sl){sl.innerHTML='<div class="empty-state">No students yet</div>';}
  }
  nav('classroom-detail');
  // Real time hall pass panel for teachers
  if(isTeacher) listenPassPanels();
}

function listenPassPanels(){
  // Clean up old listener
  if(window._passUnsub){window._passUnsub();window._passUnsub=null;}
  window._passUnsub=db.collection('hallpasses')
    .where('classId','==',currentClass.id)
    .where('school','==',currentUserData.school)
    .onSnapshot(snap=>{
      const passes=snap.docs.map(d=>({id:d.id,...d.data()}));
      const pending=passes.filter(p=>p.status==='pending');
      const active=passes.filter(p=>p.status==='active');
      const pEl=document.getElementById('pending-passes');
      if(pEl)pEl.innerHTML=pending.length?pending.map(p=>`<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}')">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}')">Deny</button></div></div>`).join(''):'<div class="empty-state">No pending requests</div>';
      const aEl=document.getElementById('active-passes');
      if(aEl)aEl.innerHTML=active.length?active.map(p=>{
        const elapsed=p.approvedAt?.toDate?Math.floor((Date.now()-p.approvedAt.toDate().getTime())/1000):0;
        const remaining=Math.max(0,(p.duration*60+p.extraSeconds||0)-elapsed);
        const mm=Math.floor(remaining/60),ss=remaining%60;
        return`<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} <span style="color:var(--blue-light);font-weight:700;">${mm}:${pad(ss)}</span><br><span style="font-size:11px;color:var(--gray)">#${p.passId}</span></div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-blue btn-sm" onclick="openResumeModal('${p.id}')">Resume</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}')">End</button></div></div>`;
      }).join(''):'<div class="empty-state">No active passes</div>';
      // Update teacher panel too
      const tpPending=document.getElementById('tp-pending');
      if(tpPending)tpPending.innerHTML=pending.length?pending.map(p=>`<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination} • ${p.duration} min</div></div><div class="pass-panel-btns"><button class="btn-blue btn-sm" onclick="approvePass('${p.id}')">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}')">Deny</button></div></div>`).join(''):'<div class="empty-state">No pending requests</div>';
      const tpActive=document.getElementById('tp-active');
      if(tpActive)tpActive.innerHTML=active.length?active.map(p=>`<div class="pass-panel"><div class="pass-panel-info"><div class="pass-panel-name">${p.studentName}</div><div class="pass-panel-dest">${p.destination}<br><span style="font-size:11px;color:var(--gray)">#${p.passId}</span></div></div><div class="pass-panel-btns"><button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-blue btn-sm" onclick="openResumeModal('${p.id}')">Resume</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}')">End</button></div></div>`).join(''):'<div class="empty-state">No active passes</div>';
    },err=>console.error('Pass panels:',err));
}

// ---- HALL PASS PANELS (fully real time) ----
function listenPassPanels(){
  if(window._passUnsub){window._passUnsub();window._passUnsub=null;}
  window._passUnsub=db.collection('hallpasses')
    .where('classId','==',currentClass.id)
    .where('school','==',currentUserData.school)
    .onSnapshot(snap=>{
      const passes=snap.docs.map(d=>({id:d.id,...d.data()}));
      const pending=passes.filter(p=>p.status==='pending');
      const active=passes.filter(p=>p.status==='active');
      const ended=passes.filter(p=>p.status==='completed'||p.status==='expired').sort((a,b)=>(b.endedAt?.toMillis?b.endedAt.toMillis():0)-(a.endedAt?.toMillis?a.endedAt.toMillis():0)).slice(0,10);

      const pEl=document.getElementById('pending-passes');
      if(pEl)pEl.innerHTML=pending.length?pending.map(p=>passPanel(p,'pending')).join(''):'<div class="empty-state">No pending requests</div>';

      const aEl=document.getElementById('active-passes');
      if(aEl)aEl.innerHTML=active.length?active.map(p=>passPanel(p,'active')).join(''):'<div class="empty-state">No active passes</div>';

      const eEl=document.getElementById('ended-passes');
      if(eEl)eEl.innerHTML=ended.length?ended.map(p=>passPanel(p,'ended')).join(''):'<div class="empty-state">No ended passes yet</div>';
    },err=>console.error('Pass panels:',err));
}

function passTimeBadge(pass){
  if(pass.status==='pending') return `<span style="background:rgba(245,158,11,.15);color:#f59e0b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">⏳ PENDING</span>`;
  if(pass.status==='completed'||pass.status==='expired') return `<span style="background:rgba(100,116,139,.15);color:#94a3b8;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">⚫ ENDED</span>`;
  if(pass.status!=='active')return '';
  if(!pass.approvedAt)return '';
  const elapsed=Math.floor((Date.now()-(pass.approvedAt.toDate?pass.approvedAt.toDate().getTime():Date.now()))/1000);
  const totalSecs=(pass.duration*60)+(pass.extraSeconds||0);
  const remaining=totalSecs-elapsed;
  const pct=remaining/totalSecs;
  if(remaining<=0) return `<span style="background:rgba(239,68,68,.15);color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">🔴 OVERDUE</span>`;
  if(pct<=0.25) return `<span style="background:rgba(239,68,68,.1);color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">🟠 RUNNING LATE</span>`;
  if(pct<=0.5) return `<span style="background:rgba(245,158,11,.15);color:#f59e0b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">🟡 WATCH</span>`;
  return `<span style="background:rgba(34,197,94,.15);color:#22c55e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">🟢 IN TIME</span>`;
}

function passTimeLeft(pass){
  if(pass.status!=='active'||!pass.approvedAt)return '';
  const elapsed=Math.floor((Date.now()-(pass.approvedAt.toDate?pass.approvedAt.toDate().getTime():Date.now()))/1000);
  const totalSecs=(pass.duration*60)+(pass.extraSeconds||0);
  const remaining=totalSecs-elapsed;
  const abs=Math.abs(remaining);
  const mm=Math.floor(abs/60),ss=abs%60;
  return remaining<0?`<span style="color:#ef4444;font-size:11px;font-weight:700;">+${mm}:${pad(ss)} overdue</span>`:`<span style="color:var(--gray);font-size:11px;">${mm}:${pad(ss)} left</span>`;
}

function passPanel(p,mode){
  const badge=passTimeBadge(p);
  const timeLeft=passTimeLeft(p);
  const btns=mode==='pending'
    ?`<button class="btn-blue btn-sm" onclick="approvePass('${p.id}')">Approve</button><button class="btn-red btn-sm" onclick="denyPass('${p.id}')">Deny</button>`
    :mode==='active'
    ?`<button class="btn-ghost btn-sm" onclick="sendTeacherMsg('${p.id}')">Msg</button><button class="btn-red btn-sm" onclick="endPassTeacher('${p.id}')">End</button>`
    :`<button class="btn-blue btn-sm" onclick="openResumeModal('${p.id}')">Resume</button>`;
  return`<div class="pass-panel" style="flex-direction:column;align-items:stretch;gap:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div class="pass-panel-name">${p.studentName}</div>
        <div class="pass-panel-dest">${p.destination} • ${p.duration}min • <span style="font-family:monospace;font-size:11px;">#${p.passId}</span></div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">${badge} ${timeLeft}</div>
      </div>
      <div class="pass-panel-btns" style="flex-direction:column;">${btns}</div>
    </div>
  </div>`;
}

// Resume modal — only for ended/expired passes, student must end when back
function openResumeModal(passId){
  const mins=prompt('Give student time to get back to class (1-10 minutes):');
  if(!mins)return;
  const extra=Math.min(10,Math.max(1,parseInt(mins)||3));
  resumePassWithTime(passId,extra);
}
async function resumePassWithTime(passId,extraMins){
  // Generate new pass ID so it's a fresh one-time use
  const newPassId=genPassId();
  await db.collection('hallpasses').doc(passId).update({
    status:'active',
    passId:newPassId,
    used:false,
    extraSeconds:extraMins*60,
    duration:0,
    resumedAt:FS.serverTimestamp(),
    resumedBy:currentUserData.name,
    approvedAt:FS.serverTimestamp(),
    approvedBy:currentUserData.name,
  });
  alert(`Pass resumed! Student has ${extraMins} minute(s) to get back. New ID: #${newPassId}`);
}

// End pass log — max 10, student must end themselves on resumed pass
async function endPassTeacher(id){
  await db.collection('hallpasses').doc(id).update({status:'completed',used:true,endedAt:FS.serverTimestamp()});
  // Trim log to 10 per class
  const snap=await db.collection('hallpasses').where('classId','==',currentClass?.id||'').where('school','==',currentUserData.school).where('status','==','completed').get();
  const ended=snap.docs.sort((a,b)=>(b.data().endedAt?.toMillis?b.data().endedAt.toMillis():0)-(a.data().endedAt?.toMillis?a.data().endedAt.toMillis():0));
  if(ended.length>10){
    const toDelete=ended.slice(10);
    await Promise.all(toDelete.map(d=>d.ref.delete()));
  }
}

async function endPass(){
  clearInterval(passTimerInterval);
  if(activePassId){
    await db.collection('hallpasses').doc(activePassId).update({status:'completed',used:true,endedAt:FS.serverTimestamp()});
    // Trim to 10
    const classId=currentClass?.id;
    if(classId){
      const snap=await db.collection('hallpasses').where('classId','==',classId).where('school','==',currentUserData.school).where('status','==','completed').get();
      const ended=snap.docs.sort((a,b)=>(b.data().endedAt?.toMillis?b.data().endedAt.toMillis():0)-(a.data().endedAt?.toMillis?a.data().endedAt.toMillis():0));
      if(ended.length>10){const toDelete=ended.slice(10);await Promise.all(toDelete.map(d=>d.ref.delete()));}
    }
  }
  activePassId=null;
  nav('classroom');
}

// Teacher panel — real time ALL school passes with badges
function renderTPPanels(){
  if(window._tpUnsub){window._tpUnsub();window._tpUnsub=null;}
  window._tpUnsub=db.collection('hallpasses')
    .where('school','==',currentUserData.school)
    .onSnapshot(snap=>{
      const passes=snap.docs.map(d=>({id:d.id,...d.data()}));
      const pending=passes.filter(p=>p.status==='pending');
      const active=passes.filter(p=>p.status==='active');
      const ended=passes.filter(p=>p.status==='completed'||p.status==='expired').sort((a,b)=>(b.endedAt?.toMillis?b.endedAt.toMillis():0)-(a.endedAt?.toMillis?a.endedAt.toMillis():0)).slice(0,10);

      const pEl=document.getElementById('tp-pending');
      if(pEl)pEl.innerHTML=pending.length?pending.map(p=>passPanel(p,'pending')).join(''):'<div class="empty-state">No pending requests</div>';

      const aEl=document.getElementById('tp-active');
      if(aEl)aEl.innerHTML=active.length?active.map(p=>passPanel(p,'active')).join(''):'<div class="empty-state">No active passes</div>';

      const eEl=document.getElementById('tp-ended');
      if(eEl)eEl.innerHTML=ended.length?ended.map(p=>passPanel(p,'ended')).join(''):'<div class="empty-state">No ended passes</div>';
    },err=>console.error('TP panels:',err));
}

async function approvePass(id){await db.collection('hallpasses').doc(id).update({status:'active',approvedAt:FS.serverTimestamp(),approvedBy:currentUserData.name});}
async function denyPass(id){await db.collection('hallpasses').doc(id).update({status:'denied',used:true,endedAt:FS.serverTimestamp()});}
async function sendTeacherMsg(id){const msg=prompt('Message to student:');if(!msg)return;await db.collection('hallpasses').doc(id).update({message:msg});alert('Message sent!');}
async function sendPassReply(){const text=document.getElementById('pass-reply-input').value.trim();if(!text||!activePassId)return;await db.collection('hallpasses').doc(activePassId).update({studentReply:text});alert('Reply sent!');document.getElementById('pass-reply-input').value='';}
async function sendPassReplyDesktop(){const text=document.getElementById('desktop-reply-input').value.trim();if(!text||!activePassId)return;await db.collection('hallpasses').doc(activePassId).update({studentReply:text});alert('Reply sent!');document.getElementById('desktop-reply-input').value='';}
async function verifyPass(){const input=document.getElementById('verify-pass-input').value.trim().replace('#','').toUpperCase();await verifyPassById(input,'verify-result');}
async function verifyPassTeacher(){const input=document.getElementById('tp-verify-input').value.trim().replace('#','').toUpperCase();await verifyPassById(input,'tp-verify-result');}
async function verifyPassById(passId,resultElId){
  const el=document.getElementById(resultElId);if(!el)return;
  el.innerHTML='<div style="color:var(--gray);font-size:13px;">Checking...</div>';
  try{
    const snap=await db.collection('hallpasses').where('passId','==',passId).where('school','==',currentUserData.school).get();
    if(snap.empty){el.innerHTML=`<div class="verify-invalid">${ICONS.x} INVALID — Pass #${passId} does not exist.</div>`;return;}
    const pass={id:snap.docs[0].id,...snap.docs[0].data()};
    const badge=passTimeBadge(pass);
    if(pass.status==='active')el.innerHTML=`<div class="verify-valid">${ICONS.check} VALID — Pass #${passId} is active. ${badge}<br><strong>Student:</strong> ${pass.studentName}<br><strong>Destination:</strong> ${pass.destination}<br><strong>Duration:</strong> ${pass.duration} min ${passTimeLeft(pass)}</div>`;
    else if(pass.status==='completed'||pass.used)el.innerHTML=`<div class="verify-expired">${ICONS.warn} EXPIRED — Pass #${passId} already used.</div>`;
    else if(pass.status==='pending')el.innerHTML=`<div class="verify-expired">${ICONS.clock} PENDING — Pass #${passId} awaiting approval.</div>`;
    else if(pass.status==='denied')el.innerHTML=`<div class="verify-invalid">${ICONS.x} DENIED — Pass #${passId} was denied.</div>`;
  }catch(e){el.innerHTML=`<div class="verify-invalid">Error: ${e.message}</div>`;}
}

function renderClassroomDetail(){
  if(!currentClass)return;
  const assignments=currentClass.assignments||[];const grades=currentClass.grades||{};
  const myGrades=assignments.map(a=>({...a,grade:(grades[a.id]||{})[currentUser.uid]}));
  const scored=myGrades.filter(a=>a.grade!==undefined&&a.grade!==null);
  const avg=scored.length?Math.round(scored.reduce((s,a)=>s+(a.grade*(a.weight/100)),0)/scored.reduce((s,a)=>s+a.weight/100,0)):null;
  const gc=document.getElementById('cd-grade-circle');gc.textContent=avg!==null?avg+'%':'—';gc.style.background=avg>=90?'#22c55e':avg>=80?'#1a56db':avg>=70?'#f59e0b':avg!==null?'#ef4444':'#1a56db';
  document.getElementById('stat-grade').textContent=avg!==null?avg+'%':'—';
  document.getElementById('cd-assignments-list').innerHTML=myGrades.length?myGrades.map(a=>`<div class="assignment-row"><div style="flex:1"><div class="assignment-name">${a.name}</div><div style="font-size:11px;color:var(--gray)">${a.category} • Weight: ${a.weight}%</div></div><div class="assignment-grade" style="color:${a.grade>=90?'#22c55e':a.grade>=70?'#3b82f6':'#ef4444'}">${a.grade!==undefined&&a.grade!==null?a.grade:'—'}</div></div>`).join(''):'<div class="empty-state">No assignments yet</div>';
}

async function joinClass(){const code=document.getElementById('join-code').value.trim().toUpperCase();if(!code||code.length!==6)return alert('Enter a valid 6-character code.');const snap=await db.collection('classrooms').where('code','==',code).where('school','==',currentUserData.school).get();if(snap.empty)return alert('Class not found. Check the code.');const classDoc=snap.docs[0];if((classDoc.data().students||[]).includes(currentUser.uid))return alert('Already in this class!');await db.collection('classrooms').doc(classDoc.id).update({students:FS.arrayUnion(currentUser.uid)});closeAllModals();alert('Joined '+classDoc.data().name+'!');}
async function createClass(){if(!currentUserData.isTeacher&&!currentUserData.isAdmin)return;const name=document.getElementById('cc-name').value.trim();const subject=document.getElementById('cc-subject').value.trim();const color=document.getElementById('cc-color').value;if(!name||!subject)return;const code=Math.random().toString(36).slice(2,8).toUpperCase();await db.collection('classrooms').add({name,subject,color,code,teacherUid:currentUser.uid,teacherName:currentUserData.name,school:currentUserData.school,students:[],assignments:[],grades:{},createdAt:FS.serverTimestamp()});closeAllModals();alert('Class created! Share code: '+code);}
async function postAssignment(){if(!currentClass)return;const name=document.getElementById('pa-name').value.trim();const category=document.getElementById('pa-category').value;const weight=parseInt(document.getElementById('pa-weight').value)||10;const due=document.getElementById('pa-due').value;if(!name)return;const assignments=[...(currentClass.assignments||[]),{id:genId(),name,category,weight,due}];await db.collection('classrooms').doc(currentClass.id).update({assignments});currentClass.assignments=assignments;renderClassroomDetail();closeAllModals();}
function switchCDTab(tab,el){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');['grades','students','assignments','passes'].forEach(t=>{const el2=document.getElementById('cd-'+t+'-tab');if(el2)el2.style.display=t===tab?'':'none';});}
function calcWhatIf(){const score=parseFloat(document.getElementById('whatif-score').value);const weight=parseFloat(document.getElementById('whatif-weight').value)||10;if(isNaN(score))return;document.getElementById('whatif-result').textContent=`This would contribute ${(score*weight/100).toFixed(1)} points to your grade.`;}

// ---- HALL PASS (real time student view) ----
function openPassRequest(){if(!currentClass)return;document.getElementById('dest-grid').style.display='grid';document.getElementById('pass-pending-screen').style.display='none';document.getElementById('pass-mobile-view').style.display='none';document.getElementById('pass-desktop-view').style.display='none';document.getElementById('pass-request-screen').style.display='';nav('hallpass');}
function selectDest(el,dest,mins){document.querySelectorAll('.dest-card').forEach(d=>d.classList.remove('selected'));el.classList.add('selected');selectedDest=dest;selectedDestMins=mins;setTimeout(()=>submitPassRequest(),300);}

async function submitPassRequest(){
  const passId=genPassId();
  const ref=await db.collection('hallpasses').add({
    passId,studentUid:currentUser.uid,studentName:currentUserData.name,
    classId:currentClass.id,destination:selectedDest,duration:selectedDestMins,
    extraSeconds:0,status:'pending',school:currentUserData.school,
    requestedAt:FS.serverTimestamp(),message:null,studentReply:null,used:false
  });
  activePassId=ref.id;
  document.getElementById('dest-grid').style.display='none';
  document.getElementById('pass-request-screen').style.display='none';
  document.getElementById('pass-pending-screen').style.display='';
  // Real time listener for approval
  const unsub=db.collection('hallpasses').doc(ref.id).onSnapshot(snap=>{
    const data=snap.data();
    if(!data)return;
    if(data.status==='active'){unsub();showActivePass({id:ref.id,...data});}
    if(data.status==='denied'){unsub();document.getElementById('pass-pending-screen').style.display='none';document.getElementById('pass-request-screen').style.display='';alert('Your pass request was denied.');nav('classroom');}
    // Show message from teacher in real time
    if(data.message&&data.status==='active'){
      const msgSection=document.getElementById('pass-msg-section');
      const msgText=document.getElementById('pass-msg-text');
      if(msgSection){msgSection.style.display='';if(msgText)msgText.textContent=data.message;}
      const dmsgSection=document.getElementById('desktop-msg-section');
      const dmsgText=document.getElementById('desktop-msg-text');
      if(dmsgSection){dmsgSection.style.display='';if(dmsgText)dmsgText.textContent=data.message;}
    }
  });
  unsubscribers.push(unsub);
}

function showActivePass(pass){
  document.getElementById('pass-pending-screen').style.display='none';
  const isMobile=window.innerWidth<=768;
  document.getElementById('pass-mobile-view').style.display=isMobile?'':'none';
  document.getElementById('pass-desktop-view').style.display=isMobile?'none':'';
  const issued=pass.approvedAt?.toDate?pass.approvedAt.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  document.getElementById('pass-avatar').textContent=currentUserData.name[0];
  document.getElementById('pass-avatar').style.background=currentUserData.avatar;
  document.getElementById('pass-student-name').textContent=currentUserData.name;
  document.getElementById('pass-school-name').textContent=currentUserData.school;
  document.getElementById('pass-dest-name').textContent=pass.destination;
  document.getElementById('pass-id-display').textContent='#'+pass.passId;
  document.getElementById('pass-issued').textContent=issued;
  document.getElementById('pass-limit').textContent=pass.duration+' min';
  document.getElementById('pass-approved-by').textContent=pass.approvedBy||'Teacher';
  document.getElementById('desktop-dest-name').textContent=pass.destination;
  document.getElementById('desktop-pass-id').textContent='#'+pass.passId;
  document.getElementById('desktop-student-name').textContent=currentUserData.name;
  document.getElementById('desktop-issued').textContent=issued;
  document.getElementById('desktop-limit').textContent=pass.duration+' min';
  document.getElementById('desktop-approved').textContent=pass.approvedBy||'Teacher';
  document.getElementById('pass-id-desktop').textContent='#'+pass.passId;
  const totalSecs=(pass.duration*60)+(pass.extraSeconds||0);
  passTotal=totalSecs;passRemaining=totalSecs;
  clearInterval(passTimerInterval);
  passTimerInterval=setInterval(tickPass,1000);
}
function tickPass(){if(passRemaining<=0){clearInterval(passTimerInterval);updatePassTimer(0);return;}passRemaining--;updatePassTimer(passRemaining);}
function updatePassTimer(secs){
  const m=Math.floor(secs/60),s=secs%60,pct=passTotal>0?secs/passTotal:0;
  document.getElementById('pass-timer-num').textContent=`${m}:${pad(s)}`;
  document.getElementById('pass-ring-pct').textContent=Math.round(pct*100)+'%';
  document.getElementById('desktop-timer-num').textContent=`${m}:${pad(s)}`;
  const ringColor=pct>0.5?'#22c55e':pct>0.2?'#f59e0b':'#ef4444';
  const mr=document.getElementById('pass-ring-circle');if(mr){mr.style.strokeDashoffset=264*(1-pct);mr.style.stroke=ringColor;}
  const dr=document.getElementById('desktop-ring-circle');if(dr){dr.style.strokeDashoffset=264*1.88*(1-pct);dr.style.stroke=ringColor;}
  const db2=document.getElementById('pass-dest-box');if(db2)db2.style.borderColor=pct<=0.2?'#ef4444':pct<=0.5?'#f59e0b':'#22c55e';
}
// pass functions now handled above in listenPassPanels section

// ---- CLUBS (real time + club portal) ----
function renderClubs(){
  const unsub=db.collection('clubs').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const clubs=snap.docs.map(d=>({id:d.id,...d.data()}));
    document.getElementById('clubs-list').innerHTML=clubs.length?clubs.map(c=>{
      const isMember=(c.members||[]).includes(currentUser.uid)||c.president===currentUser.uid;
      const canDelete=c.president===currentUser.uid||currentUserData.isAdmin;
      return`<div class="club-card" onclick="openClubPortal('${c.id}')">
        <div class="club-emoji">${c.emoji||'🎯'}</div>
        <div class="club-name">${c.name}</div>
        <div class="club-desc">${c.description||''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <div class="club-role-badge">${c.president===currentUser.uid?'President':isMember?'Member':'Tap to Join'}</div>
          <div style="font-size:10px;color:var(--gray);font-family:monospace;letter-spacing:2px;">CODE: ${c.code||'—'}</div>
        </div>
        ${canDelete?`<button class="btn-red btn-sm" style="margin-top:10px;width:100%;" onclick="event.stopPropagation();deleteClub('${c.id}','${c.name}')">Delete Club</button>`:''}
      </div>`;
    }).join(''):'<div class="empty-state">No clubs yet</div>';
  },err=>console.error('Clubs:',err));
  unsubscribers.push(unsub);
}

async function deleteClub(id, name){
  if(!confirm(`Delete "${name}"? This removes the club, all messages and sign ups permanently. This cannot be undone.`))return;
  // Delete subcollections first
  const cols=['messages','announcements','signup'];
  for(const col of cols){
    const snap=await db.collection('clubs').doc(id).collection(col).get();
    await Promise.all(snap.docs.map(d=>d.ref.delete()));
  }
  await db.collection('clubs').doc(id).delete();
  alert(`${name} has been deleted.`);
}

async function openClubPortal(id){
  const snap=await db.collection('clubs').doc(id).get();
  if(!snap.exists)return;
  currentClub={id,...snap.data()};
  const isMember=(currentClub.members||[]).includes(currentUser.uid)||currentClub.president===currentUser.uid;
  if(!isMember){
    if(confirm(`Join ${currentClub.name}?`)){
      await db.collection('clubs').doc(id).update({members:FS.arrayUnion(currentUser.uid)});
      currentClub.members=[...(currentClub.members||[]),currentUser.uid];
    }else return;
  }
  // Build club portal page
  const mainContent=document.getElementById('page-clubs');
  mainContent.innerHTML=`
    <div class="page-header">
      <div>
        <button class="back-btn" onclick="backToClubs()">← Back to Clubs</button>
        <div class="page-title">${currentClub.emoji||'🎯'} ${currentClub.name}</div>
        <div class="page-sub">${currentClub.description||''}</div>
      </div>
      ${currentClub.president===currentUser.uid?`<button class="btn-blue" onclick="openModal('club-announce-modal')">+ Announcement</button>`:''}
    </div>
    <div class="tab-row">
      <button class="tab-btn active" onclick="switchClubTab('chat',this)">Chat</button>
      <button class="tab-btn" onclick="switchClubTab('members',this)">Members</button>
      <button class="tab-btn" onclick="switchClubTab('announcements',this)">Announcements</button>
      <button class="tab-btn" onclick="switchClubTab('signup',this)">Sign Up</button>
    </div>
    <div id="club-chat-tab">
      <div class="chat-layout" style="height:400px;">
        <div class="chat-main" id="club-chat-main" style="display:flex;flex-direction:column;">
          <div class="chat-messages" id="club-messages" style="flex:1;overflow-y:auto;padding:14px;"></div>
          <div class="chat-input-area">
            <input class="chat-input" placeholder="Message ${currentClub.name}..." id="club-chat-input" onkeydown="if(event.key==='Enter')sendClubMsg()">
            <button class="chat-send" onclick="sendClubMsg()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="club-members-tab" style="display:none;">
      <div class="card"><div class="clbl card-label">MEMBERS</div><div id="club-members-list"><div class="empty-state">Loading...</div></div></div>
    </div>
    <div id="club-announcements-tab" style="display:none;">
      <div id="club-ann-list"><div class="empty-state">No announcements yet</div></div>
    </div>
    <div id="club-signup-tab" style="display:none;">
      <div class="card">
        <div class="card-label">SIGN UP SHEET</div>
        <div id="club-signup-list"><div class="empty-state">No sign up items yet</div></div>
        ${currentClub.president===currentUser.uid?`
          <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">
            <div class="card-label">ADD SIGN UP ITEM</div>
            <input class="input" placeholder="Sign up item (e.g. Bring snacks, Lead meeting)..." id="club-signup-input">
            <div style="display:flex;gap:8px;">
              <input class="input" type="number" placeholder="Max spots (leave blank = unlimited)..." id="club-signup-max" style="flex:1;">
              <input class="input" type="date" placeholder="Deadline..." id="club-signup-deadline" style="flex:1;">
            </div>
            <button class="btn-blue" onclick="addClubSignup()">+ Add Item</button>
          </div>
        `:''}
      </div>
    </div>
  `;
  listenClubChat(id);
  listenClubMembers(id);
  listenClubAnnouncements(id);
  listenClubSignup(id);
}

function backToClubs(){
  const mainContent=document.getElementById('page-clubs');
  mainContent.innerHTML=`
    <div class="page-header">
      <div><div class="page-title">Clubs</div><div class="page-sub">School clubs & organizations</div></div>
      <div style="display:flex;gap:8px;">
        <button class="btn-ghost" onclick="joinClubByCode()">Join by Code</button>
        ${currentUserData.isAdmin?'<button class="btn-blue" onclick="openModal(\'club-modal\')">+ Create Club</button>':''}
      </div>
    </div>
    <div class="grid-3" id="clubs-list"><div class="empty-state">Loading...</div></div>
  `;
  renderClubs();
}

function switchClubTab(tab,el){
  document.querySelectorAll('#page-clubs .tab-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
  ['chat','members','announcements','signup'].forEach(t=>{const el2=document.getElementById('club-'+t+'-tab');if(el2)el2.style.display=t===tab?'':'none';});
}

function listenClubChat(clubId){
  if(window._clubChatUnsub){window._clubChatUnsub();}
  window._clubChatUnsub=db.collection('clubs').doc(clubId).collection('messages').onSnapshot(snap=>{
    const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
    const el=document.getElementById('club-messages');if(!el)return;
    el.innerHTML=msgs.length?msgs.map(m=>`<div class="chat-msg ${m.uid===currentUser.uid?'me':'other'}">${m.uid!==currentUser.uid?`<div class="chat-msg-sender">${m.name}</div>`:''}<div class="chat-msg-bubble">${m.text}</div></div>`).join(''):'<div class="empty-state" style="padding:20px;">No messages yet. Say something!</div>';
    el.scrollTop=el.scrollHeight;
  });
}

async function sendClubMsg(){
  if(!currentClub)return;
  const input=document.getElementById('club-chat-input');if(!input||!input.value.trim())return;
  const text=input.value.trim();input.value='';
  await db.collection('clubs').doc(currentClub.id).collection('messages').add({text,uid:currentUser.uid,name:currentUserData.name,sentAt:FS.serverTimestamp()});
}

async function listenClubMembers(clubId){
  const snap=await db.collection('clubs').doc(clubId).get();
  if(!snap.exists)return;
  const data=snap.data();
  const memberUids=[data.president,...(data.members||[]).filter(u=>u!==data.president)];
  const userSnaps=await Promise.all(memberUids.map(uid=>db.collection('users').doc(uid).get()));
  const el=document.getElementById('club-members-list');if(!el)return;
  el.innerHTML=userSnaps.filter(s=>s.exists).map(s=>{const u=s.data();const isPresident=u.uid===data.president;return`<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div><div style="flex:1"><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div>${isPresident?`<span class="club-role-badge">President</span>`:''}</div>`;}).join('');
}

function listenClubAnnouncements(clubId){
  if(window._clubAnnUnsub){window._clubAnnUnsub();}
  window._clubAnnUnsub=db.collection('clubs').doc(clubId).collection('announcements').onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    const el=document.getElementById('club-ann-list');if(!el)return;
    el.innerHTML=items.length?items.map(a=>`<div class="ann-card"><div class="ann-title">${a.title}</div><div class="ann-body">${a.body}</div><div class="ann-meta"><span>${a.postedByName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Just now'}</span></div></div>`).join(''):'<div class="empty-state">No announcements yet</div>';
  });
}

function listenClubSignup(clubId){
  if(window._clubSignupUnsub){window._clubSignupUnsub();}
  window._clubSignupUnsub=db.collection('clubs').doc(clubId).collection('signup').onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    const el=document.getElementById('club-signup-list');if(!el)return;
    el.innerHTML=items.length?items.map(s=>{
      const signedUp=(s.signups||[]).includes(currentUser.uid);
      const count=(s.signups||[]).length;
      const max=s.maxSpots||999;
      const full=count>=max;
      const deadline=s.deadline?daysDiff(s.deadline):null;
      const expired=deadline!==null&&deadline<0;
      const isLeader=currentClub&&(currentClub.president===currentUser.uid||(currentClub.officers||[]).includes(currentUser.uid));
      // get names of who signed up
      const signupNames=(s.signupNames||[]).join(', ');
      return`<div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">${s.item}</div>
            <div style="font-size:11px;color:var(--gray);">${count}${max<999?'/'+max:''} signed up${s.deadline?` • Deadline: ${s.deadline}${expired?' (EXPIRED)':''}`:''}</div>
            ${signupNames?`<div style="font-size:11px;color:var(--gray-dark);margin-top:4px;">👥 ${signupNames}</div>`:''}
          </div>
          ${!expired&&!full&&!signedUp?`<button class="btn-blue btn-sm" onclick="toggleClubSignup('${s.id}','${clubId}')">Sign Up</button>`:signedUp?`<button class="btn-ghost btn-sm" onclick="toggleClubSignup('${s.id}','${clubId}')">Signed Up ✓</button>`:`<span style="font-size:11px;color:var(--gray);padding:6px 10px;">${expired?'Expired':'Full'}</span>`}
        </div>
      </div>`;
    }).join(''):'<div class="empty-state">No sign up items yet</div>';
  });
}

async function addClubSignup(){
  if(!currentClub)return;
  const text=document.getElementById('club-signup-input').value.trim();
  const maxSpots=parseInt(document.getElementById('club-signup-max').value)||999;
  const deadline=document.getElementById('club-signup-deadline').value;
  if(!text)return;
  await db.collection('clubs').doc(currentClub.id).collection('signup').add({item:text,signups:[],signupNames:[],maxSpots,deadline:deadline||null,createdAt:FS.serverTimestamp()});
  document.getElementById('club-signup-input').value='';
  document.getElementById('club-signup-max').value='';
  document.getElementById('club-signup-deadline').value='';
}

async function toggleClubSignup(itemId,clubId){
  const ref=db.collection('clubs').doc(clubId).collection('signup').doc(itemId);
  const snap=await ref.get();if(!snap.exists)return;
  const data=snap.data();
  const signups=data.signups||[];
  const signupNames=data.signupNames||[];
  if(signups.includes(currentUser.uid)){
    await ref.update({signups:FS.arrayRemove(currentUser.uid),signupNames:signupNames.filter(n=>n!==currentUserData.name)});
  }else{
    const max=data.maxSpots||999;
    if(signups.length>=max)return alert('This sign up is full!');
    if(data.deadline&&daysDiff(data.deadline)<0)return alert('The deadline for this sign up has passed!');
    await ref.update({signups:FS.arrayUnion(currentUser.uid),signupNames:FS.arrayUnion(currentUserData.name)});
  }
}

async function postClubAnnouncement(){
  if(!currentClub)return;
  const title=document.getElementById('club-ann-title').value.trim();
  const body=document.getElementById('club-ann-body').value.trim();
  if(!title||!body)return;
  await db.collection('clubs').doc(currentClub.id).collection('announcements').add({title,body,postedBy:currentUser.uid,postedByName:currentUserData.name,createdAt:FS.serverTimestamp()});
  closeAllModals();document.getElementById('club-ann-title').value='';document.getElementById('club-ann-body').value='';
}

async function createClub(){
  if(!currentUserData.isAdmin)return;
  const name=document.getElementById('club-name').value.trim();
  const description=document.getElementById('club-desc').value.trim();
  const emoji=document.getElementById('club-emoji').value||'🎯';
  if(!name)return;
  const code=Math.random().toString(36).slice(2,8).toUpperCase();
  await db.collection('clubs').add({name,description,emoji,code,president:currentUser.uid,members:[currentUser.uid],school:currentUserData.school,createdAt:FS.serverTimestamp()});
  closeAllModals();['club-name','club-desc','club-emoji'].forEach(id=>document.getElementById(id).value='');
  alert(`Club created! Join code: ${code}`);
}

// ---- SPORTS (real time) ----
function renderSports(){
  const unsub=db.collection('sports').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('sports-list').innerHTML=items.length?items.map(s=>{const result=parseInt(s.ourScore)>parseInt(s.theirScore)?'WIN':parseInt(s.ourScore)<parseInt(s.theirScore)?'LOSS':'TIE';const cls=result==='WIN'?'wlt-win':result==='LOSS'?'wlt-loss':'wlt-tie';return`<div class="sport-card"><div class="sport-header"><span class="sport-tag">${s.sport}</span><span class="wlt-badge ${cls}">${result}</span></div><div class="score-row"><div class="score-team"><div class="score-team-name">Panthers</div><div class="score-num">${s.ourScore}</div></div><div class="score-vs">VS</div><div class="score-team"><div class="score-team-name">${s.opponent}</div><div class="score-num">${s.theirScore}</div></div></div><div style="font-size:12px;color:var(--gray);margin-top:10px;">${s.date}</div>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" style="margin-top:8px;" onclick="deleteSport('${s.id}')">Delete</button>`:''}</div>`;}).join(''):'<div class="empty-state">No game results yet</div>';
  },err=>console.error('Sports:',err));
  unsubscribers.push(unsub);
}
async function addSportResult(){
  const sport=document.getElementById('sport-type').value;const opponent=document.getElementById('sport-opp').value.trim();const ourScore=document.getElementById('sport-us').value;const theirScore=document.getElementById('sport-them').value;const date=document.getElementById('sport-date').value;
  if(!opponent||!ourScore||!theirScore||!date)return alert('Please fill in all fields.');
  try{await db.collection('sports').add({sport,opponent,ourScore,theirScore,date,school:currentUserData.school,postedBy:currentUser.uid,createdAt:FS.serverTimestamp()});closeAllModals();['sport-opp','sport-us','sport-them','sport-date'].forEach(id=>document.getElementById(id).value='');}
  catch(e){alert('Error: '+e.message);}
}
async function deleteSport(id){await db.collection('sports').doc(id).delete();}

// ---- POLLS (real time) ----
function renderPolls(){
  const unsub=db.collection('polls').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('polls-list').innerHTML=items.length?items.map(p=>{
      const totalVotes=Object.values(p.votes||{}).length;
      const voted=(p.votes||{})[currentUser.uid]!==undefined;
      const optHTML=p.options.map((opt,i)=>{const count=Object.values(p.votes||{}).filter(v=>v===i).length;const pct=totalVotes?Math.round(count/totalVotes*100):0;return`<div class="poll-opt" style="cursor:${!voted?'pointer':'default'}" onclick="${!voted?`castVote('${p.id}',${i})`:''}"><div class="poll-opt-label"><span>${opt}</span><span>${pct}%</span></div><div class="poll-bar"><div class="poll-fill" style="width:${pct}%"></div></div></div>`;}).join('');
      return`<div class="poll-card"><div class="poll-q">${p.question}</div>${optHTML}<div style="font-size:12px;color:var(--gray);margin-top:8px;">${totalVotes} votes${currentUserData.isAdmin?` • <button class="btn-ghost btn-sm" onclick="deletePoll('${p.id}')">Delete</button>`:''}</div></div>`;
    }).join(''):'<div class="empty-state">No polls yet</div>';
  },err=>console.error('Polls:',err));
  unsubscribers.push(unsub);
}
async function createPoll(){
  if(!currentUserData.isAdmin)return;
  const q=document.getElementById('poll-q').value.trim();
  const opts=['poll-o1','poll-o2','poll-o3','poll-o4'].map(id=>document.getElementById(id).value.trim()).filter(Boolean);
  if(!q||opts.length<2)return alert('Need a question and at least 2 options.');
  try{await db.collection('polls').add({question:q,options:opts,votes:{},school:currentUserData.school,createdAt:FS.serverTimestamp(),postedBy:currentUser.uid});closeAllModals();['poll-q','poll-o1','poll-o2','poll-o3','poll-o4'].forEach(id=>document.getElementById(id).value='');}
  catch(e){alert('Error: '+e.message);}
}
async function castVote(pollId,optIdx){const ref=db.collection('polls').doc(pollId);const snap=await ref.get();if(!snap.exists)return;if((snap.data().votes||{})[currentUser.uid]!==undefined)return;await ref.update({[`votes.${currentUser.uid}`]:optIdx});}
async function deletePoll(id){await db.collection('polls').doc(id).delete();}

// ---- DIRECTORY (real time) ----
async function renderDirectory(){
  const snap=await db.collection('users').where('school','==',currentUserData.school).get();
  displayDir(snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser.uid));
}
function displayDir(users){document.getElementById('dir-list').innerHTML=users.length?users.map(u=>`<div class="dir-item"><div class="dir-avatar" style="background:${u.avatar||'linear-gradient(135deg,#1a56db,#3b82f6)'}">${u.name[0]}</div><div style="flex:1"><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div><span class="role-badge ${u.isAdmin?'role-admin':u.isTeacher?'role-teacher':'role-student'}">${u.isAdmin?'Admin':u.isTeacher?'Teacher':'Student'}</span></div>`).join(''):'<div class="empty-state">No students found</div>';}
async function filterDir(){const q=document.getElementById('dir-search').value.toLowerCase();const snap=await db.collection('users').where('school','==',currentUserData.school).get();displayDir(snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser.uid&&u.name.toLowerCase().includes(q)));}

// ---- LOST & FOUND (real time) ----
function renderLostFound(){
  const unsub=db.collection('lostfound').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('lf-list').innerHTML=items.length?items.map(i=>`<div class="lf-card"><div class="lf-status-badge ${i.status==='Lost'?'lf-lost':'lf-found'}">${i.status.toUpperCase()}</div><div style="flex:1"><div class="lf-name">${i.name}</div><div class="lf-loc">${i.location} • ${i.postedByName}</div></div>${i.postedBy===currentUser.uid||currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteLF('${i.id}')">×</button>`:''}</div>`).join(''):'<div class="empty-state">No items posted</div>';
  },err=>console.error('LF:',err));
  unsubscribers.push(unsub);
}
async function addLF(){
  const name=document.getElementById('lf-item').value.trim();const location=document.getElementById('lf-loc').value.trim();const status=document.getElementById('lf-status').value;
  if(!name)return alert('Please enter an item name.');
  try{await db.collection('lostfound').add({name,location,status,postedBy:currentUser.uid,postedByName:currentUserData.name,school:currentUserData.school,createdAt:FS.serverTimestamp()});closeAllModals();['lf-item','lf-loc'].forEach(id=>document.getElementById(id).value='');}
  catch(e){alert('Error: '+e.message);}
}
async function deleteLF(id){await db.collection('lostfound').doc(id).delete();}

// ---- CARPOOL (real time) ----
function renderCarpool(){
  const unsub=db.collection('carpool').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('cp-list').innerHTML=items.length?items.map(i=>`<div class="cp-card"><div class="cp-icon">${parseInt(i.seats)>0?ICONS.car:ICONS.hand}</div><div style="flex:1"><div class="cp-area">${i.area}</div><div class="cp-info">${i.contact}</div></div><div class="cp-seats-badge">${parseInt(i.seats)>0?i.seats+' seats':'Looking'}</div>${i.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteCP('${i.id}')">×</button>`:''}</div>`).join(''):'<div class="empty-state">No carpool posts yet</div>';
  },err=>console.error('Carpool:',err));
  unsubscribers.push(unsub);
}
async function addCarpool(){
  const area=document.getElementById('cp-area').value.trim();const seats=document.getElementById('cp-seats').value;const contact=document.getElementById('cp-contact').value.trim();
  if(!area||!contact)return alert('Please fill in area and contact info.');
  try{await db.collection('carpool').add({area,seats:seats||'0',contact,postedBy:currentUser.uid,school:currentUserData.school,createdAt:FS.serverTimestamp()});closeAllModals();['cp-area','cp-seats','cp-contact'].forEach(id=>document.getElementById(id).value='');}
  catch(e){alert('Error: '+e.message);}
}
async function deleteCP(id){await db.collection('carpool').doc(id).delete();}

// ---- GROUP CHATS (real time + teacher/admin moderation) ----

// Check if current user is chat-suspended or chat-banned
async function getChatRestriction(){
  const snap=await db.collection('chatRestrictions').doc(currentUser.uid).get();
  if(!snap.exists)return null;
  const data=snap.data();
  if(data.banned)return{type:'banned',reason:data.reason||'You have been banned from group chats.'};
  if(data.suspended&&data.suspendedUntil){
    const until=data.suspendedUntil.toDate?data.suspendedUntil.toDate():new Date(data.suspendedUntil);
    if(until>new Date())return{type:'suspended',until,reason:data.reason||'You are temporarily suspended from creating group chats.'};
  }
  return null;
}

function renderChats(){
  const isStaff=currentUserData.isTeacher||currentUserData.isAdmin;
  // Staff see ALL chats at school, students see only their own
  const q=isStaff
    ?db.collection('chats').where('school','==',currentUserData.school)
    :db.collection('chats').where('school','==',currentUserData.school).where('memberEmails','array-contains',currentUserData.email);
  const unsub=q.onSnapshot(snap=>{
    const chats=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    const el=document.getElementById('chat-list');
    el.innerHTML=chats.length?chats.map(c=>{
      const daysLeft=Math.max(0,14-Math.floor((Date.now()-(c.createdAt?.toDate?c.createdAt.toDate().getTime():Date.now()))/86400000));
      const canDelete=isStaff||c.createdBy===currentUser.uid;
      const staffBtns=isStaff?`<div style="display:flex;gap:4px;margin-top:6px;"><button class="btn-red btn-sm" onclick="event.stopPropagation();deleteChat('${c.id}')">Delete</button></div>`:'';
      const ownerBtn=!isStaff&&canDelete?`<div style="display:flex;gap:4px;margin-top:6px;"><button class="btn-ghost btn-sm" onclick="event.stopPropagation();deleteChat('${c.id}')">Delete</button></div>`:'';
      return`<div class="chat-item" onclick="openChat('${c.id}')">
        <div class="chat-item-name">${c.name}${isStaff&&c.createdByName?` <span style="font-size:10px;color:var(--gray);">by ${c.createdByName}</span>`:''}</div>
        <div class="chat-item-preview">${c.lastMessage||'No messages yet'}</div>
        <div class="chat-item-meta"><span style="font-size:10px;color:var(--gray);">${(c.memberEmails||[]).length} members</span><span class="chat-expires-badge">${daysLeft}d left</span></div>
        ${staffBtns}${ownerBtn}
      </div>`;
    }).join(''):'<div class="empty-state">No chats yet</div>';
    // Staff panel
    if(isStaff) renderChatModerationPanel();
  },err=>console.error('Chats:',err));
  unsubscribers.push(unsub);
}

async function createChat(){
  const name=document.getElementById('new-chat-name').value.trim();if(!name)return;
  // Check restriction unless staff
  if(!currentUserData.isTeacher&&!currentUserData.isAdmin){
    const restriction=await getChatRestriction();
    if(restriction){
      if(restriction.type==='banned')return alert('🚫 '+restriction.reason);
      if(restriction.type==='suspended')return alert(`⏳ ${restriction.reason}\nSuspension ends: ${restriction.until.toLocaleDateString()}`);
    }
  }
  const memberEmails=[currentUserData.email,...chatMembers];
  try{
    await db.collection('chats').add({
      name,memberEmails,school:currentUserData.school,
      createdAt:FS.serverTimestamp(),lastMessage:null,
      createdBy:currentUser.uid,createdByName:currentUserData.name
    });
    chatMembers=[];document.getElementById('chat-members-list').innerHTML='';
    closeAllModals();document.getElementById('new-chat-name').value='';
  }catch(e){alert('Error: '+e.message);}
}

async function deleteChat(id){
  if(!currentUserData.isTeacher&&!currentUserData.isAdmin)return;
  if(!confirm('Delete this chat? This cannot be undone.'))return;
  await db.collection('chats').doc(id).delete();
}

// ---- CHAT MODERATION PANEL (teacher/admin only) ----
function renderChatModerationPanel(){
  const panelEl=document.getElementById('chat-mod-panel');
  if(!panelEl)return;
  // Listen to all restrictions real time
  if(window._modUnsub){window._modUnsub();}
  window._modUnsub=db.collection('chatRestrictions').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const restrictions=snap.docs.map(d=>({id:d.id,...d.data()}));
    const active=restrictions.filter(r=>r.banned||(r.suspended&&r.suspendedUntil?.toDate&&r.suspendedUntil.toDate()>new Date()));
    panelEl.innerHTML=`
      <div class="card" style="margin-top:14px;">
        <div class="card-label" style="color:var(--red);">CHAT MODERATION</div>
        <div style="font-size:12px;color:var(--gray);margin-bottom:12px;">Suspend or ban students from group chats</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input class="input" style="flex:1;margin:0;" placeholder="Student email..." id="mod-email-input">
          <select class="input" style="width:160px;margin:0;" id="mod-action">
            <option value="suspend3">Suspend 3 days</option>
            <option value="suspend7">Suspend 7 days</option>
            <option value="suspend14">Suspend 14 days</option>
            <option value="suspend30">Suspend 30 days</option>
            <option value="ban">Ban permanently</option>
            <option value="disable">Disable chat creation</option>
            <option value="lift">Lift all restrictions</option>
          </select>
        </div>
        <input class="input" placeholder="Reason (optional)..." id="mod-reason-input">
        <button class="btn-blue" onclick="applyChatRestriction()">Apply</button>
        ${active.length?`
          <div class="card-label" style="margin-top:16px;">ACTIVE RESTRICTIONS</div>
          ${active.map(r=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <div>
              <div style="font-weight:600;color:var(--white);">${r.name||r.id}</div>
              <div style="font-size:11px;color:var(--gray);">${r.banned?'Banned':r.disabled?'Chat creation disabled':`Suspended until ${r.suspendedUntil?.toDate?r.suspendedUntil.toDate().toLocaleDateString():'?'}`}</div>
              ${r.reason?`<div style="font-size:11px;color:var(--gray-dark);">Reason: ${r.reason}</div>`:''}
            </div>
            <button class="btn-ghost btn-sm" onclick="liftChatRestriction('${r.id}')">Lift</button>
          </div>`).join('')}
        `:'<div style="font-size:12px;color:var(--gray);margin-top:8px;">No active restrictions</div>'}
      </div>
    `;
  });
}

async function applyChatRestriction(){
  if(!currentUserData.isTeacher&&!currentUserData.isAdmin)return;
  const email=document.getElementById('mod-email-input').value.trim().toLowerCase();
  const action=document.getElementById('mod-action').value;
  const reason=document.getElementById('mod-reason-input').value.trim();
  if(!email)return alert('Enter a student email.');
  // Find user
  const snap=await db.collection('users').where('email','==',email).where('school','==',currentUserData.school).get();
  if(snap.empty)return alert('No user found with that email at your school.');
  const user=snap.docs[0].data();
  if(user.isAdmin||user.isTeacher)return alert("Can't restrict staff members.");
  const uid=user.uid;
  const now=new Date();
  let data={school:currentUserData.school,name:user.name,email,appliedBy:currentUser.uid,appliedByName:currentUserData.name,reason,updatedAt:FS.serverTimestamp()};
  if(action==='lift'){await liftChatRestriction(uid);return;}
  if(action==='ban'){data={...data,banned:true,suspended:false,disabled:false};}
  else if(action==='disable'){data={...data,disabled:true,banned:false,suspended:false};}
  else{
    const days=parseInt(action.replace('suspend',''));
    const until=new Date(now.getTime()+days*86400000);
    data={...data,suspended:true,suspendedUntil:firebase.firestore.Timestamp.fromDate(until),banned:false,disabled:false};
  }
  await db.collection('chatRestrictions').doc(uid).set(data,{merge:true});
  document.getElementById('mod-email-input').value='';
  document.getElementById('mod-reason-input').value='';
  alert(`Restriction applied to ${user.name}!`);
}

async function liftChatRestriction(uid){
  await db.collection('chatRestrictions').doc(uid).delete();
  alert('Restriction lifted!');
}
async function addChatMember(){
  const email=document.getElementById('chat-member-email').value.trim();if(!email)return;
  const snap=await db.collection('users').where('email','==',email).where('school','==',currentUserData.school).get();
  if(snap.empty)return alert('No user found with that email at your school.');
  if(chatMembers.includes(email))return alert('Already added!');
  const user=snap.docs[0].data();chatMembers.push(email);
  document.getElementById('chat-members-list').innerHTML+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);"><div class="dir-avatar" style="background:${user.avatar};width:28px;height:28px;font-size:11px;">${user.name[0]}</div>${user.name} <span style="color:var(--gray)">(${email})</span></div>`;
  document.getElementById('chat-member-email').value='';
}
// openChat and sendChatMsg defined below with media support


// ---- STUDY GROUPS (real time) ----
function renderStudyGroups(){
  const unsub=db.collection('studygroups').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('sg-list').innerHTML=items.length?items.map(s=>{const full=(s.members||[]).length>=s.spots;return`<div class="sg-card"><div class="sg-info"><div class="sg-subject">${s.subject}</div><div class="sg-details">📍 ${s.location}</div><div class="sg-details">${(s.members||[]).length}/${s.spots} spots</div></div><span class="sg-spots-badge ${full?'sg-full':'sg-open'}">${full?'FULL':'OPEN'}</span>${!full&&!(s.members||[]).includes(currentUser.uid)?`<button class="btn-blue btn-sm" onclick="joinStudyGroup('${s.id}')">Join</button>`:''} ${s.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteSG('${s.id}')">×</button>`:''}</div>`;}).join(''):'<div class="empty-state">No study groups yet</div>';
  },err=>console.error('SG:',err));
  unsubscribers.push(unsub);
}
async function addStudyGroup(){const subject=document.getElementById('sg-subj').value.trim();const location=document.getElementById('sg-loc').value.trim();const time=document.getElementById('sg-time').value;const spots=parseInt(document.getElementById('sg-spots').value)||5;if(!subject)return;await db.collection('studygroups').add({subject,location,time,spots,members:[currentUser.uid],postedBy:currentUser.uid,school:currentUserData.school,createdAt:FS.serverTimestamp()});closeAllModals();}
async function joinStudyGroup(id){await db.collection('studygroups').doc(id).update({members:FS.arrayUnion(currentUser.uid)});}
async function deleteSG(id){await db.collection('studygroups').doc(id).delete();}

// ---- REMINDERS (fixed date calc) ----
function renderReminders(){
  const el=document.getElementById('rem-list');
  if(!el)return;
  const items=lsArr('ss_reminders_'+currentUser.uid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  el.innerHTML=items.length?items.map(r=>{
    const days=r.date?daysDiff(r.date):null;
    const cls=days===null?'var(--gray)':days<0?'var(--red)':days===0?'var(--red)':days===1?'var(--gold)':'var(--blue-light)';
    const label=days===null?'—':days<0?'PAST':days===0?'TODAY':days===1?'TOMORROW':days+' days';
    return`<div class="rem-card"><div class="rem-days" style="color:${cls};font-size:${days!==null&&days>=100?'18px':''};">${label}</div><div style="flex:1"><div class="rem-text">${r.text}</div>${r.date?`<div class="rem-date">${r.date}</div>`:''}</div><button class="btn-ghost btn-sm" onclick="deleteReminder('${r.id}')">×</button></div>`;
  }).join(''):'<div class="empty-state">No reminders yet</div>';
}
function addReminder(){const text=document.getElementById('rem-text').value.trim();const date=document.getElementById('rem-date').value;if(!text)return;const items=lsArr('ss_reminders_'+currentUser.uid);items.push({id:genId(),text,date});ls('ss_reminders_'+currentUser.uid,items);renderReminders();closeAllModals();document.getElementById('rem-text').value='';document.getElementById('rem-date').value='';}
function deleteReminder(id){ls('ss_reminders_'+currentUser.uid,lsArr('ss_reminders_'+currentUser.uid).filter(r=>r.id!==id));renderReminders();}

// ---- PROFILE ----
function renderProfile(){const av=document.getElementById('profile-avatar-big');av.textContent=currentUserData.name[0].toUpperCase();av.style.background=currentUserData.avatar;document.getElementById('profile-name-input').value=currentUserData.name;}
async function selectAvatar(el,gradient){document.querySelectorAll('.avatar-swatch').forEach(s=>s.classList.remove('selected'));el.classList.add('selected');document.getElementById('profile-avatar-big').style.background=gradient;await db.collection('users').doc(currentUser.uid).update({avatar:gradient});currentUserData.avatar=gradient;document.getElementById('sidebar-avatar').style.background=gradient;}
async function saveProfile(){const name=document.getElementById('profile-name-input').value.trim();if(!name)return;await db.collection('users').doc(currentUser.uid).update({name});currentUserData.name=name;document.getElementById('sidebar-name').textContent=name;document.getElementById('profile-avatar-big').textContent=name[0].toUpperCase();document.getElementById('sidebar-avatar').textContent=name[0].toUpperCase();alert('Profile saved!');}

// ---- ADMIN ----
async function approveTeacher(){const email=document.getElementById('teacher-email-input').value.trim().toLowerCase();if(!email)return;const school=currentUserData.school;await db.collection('schoolRoles').doc(school).set({teachers:FS.arrayUnion(email)},{merge:true});const snap=await db.collection('users').where('email','==',email).where('school','==',school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isTeacher:true,role:'teacher'});renderApprovedTeachers();document.getElementById('teacher-email-input').value='';alert('Teacher access granted!');}
async function grantAdmin(){const email=document.getElementById('admin-email-input').value.trim().toLowerCase();if(!email)return;const school=currentUserData.school;await db.collection('schoolRoles').doc(school).set({admins:FS.arrayUnion(email),teachers:FS.arrayUnion(email)},{merge:true});const snap=await db.collection('users').where('email','==',email).where('school','==',school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isAdmin:true,isTeacher:true,role:'teacher'});renderApprovedAdmins();document.getElementById('admin-email-input').value='';alert('Admin access granted!');}
async function renderApprovedTeachers(){const snap=await db.collection('schoolRoles').doc(currentUserData.school).get();const data=snap.exists?snap.data():{};const teachers=data.teachers||[];const el=document.getElementById('approved-teachers-list');if(!el)return;el.innerHTML=teachers.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeTeacher('${e}')">Remove</button></div>`).join('')||'<div style="font-size:12px;color:var(--gray);padding:6px 0;">No teachers added yet</div>';}
async function renderApprovedAdmins(){const snap=await db.collection('schoolRoles').doc(currentUserData.school).get();const data=snap.exists?snap.data():{};const admins=data.admins||[];const el=document.getElementById('approved-admins-list');if(!el)return;el.innerHTML=admins.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeAdmin('${e}')">Remove</button></div>`).join('')||'<div style="font-size:12px;color:var(--gray);padding:6px 0;">No admins added yet</div>';}
async function removeTeacher(email){await db.collection('schoolRoles').doc(currentUserData.school).update({teachers:FS.arrayRemove(email)});const snap=await db.collection('users').where('email','==',email).where('school','==',currentUserData.school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isTeacher:false,role:'student'});renderApprovedTeachers();}
async function removeAdmin(email){if(email==='mykahsheppard@g.horrycountyschools.net')return alert("Can't remove the founder!");await db.collection('schoolRoles').doc(currentUserData.school).update({admins:FS.arrayRemove(email)});const snap=await db.collection('users').where('email','==',email).where('school','==',currentUserData.school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isAdmin:false});renderApprovedAdmins();}
async function bulkApproveTeachers(){const emails=document.getElementById('bulk-teachers').value.split('\n').map(e=>e.trim().toLowerCase()).filter(Boolean);const school=currentUserData.school;for(const email of emails){await db.collection('schoolRoles').doc(school).set({teachers:FS.arrayUnion(email)},{merge:true});const snap=await db.collection('users').where('email','==',email).where('school','==',school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isTeacher:true,role:'teacher'});}renderApprovedTeachers();document.getElementById('bulk-teachers').value='';alert(`${emails.length} teachers granted access!`);}

// ---- MODALS ----
function openModal(id){document.querySelector('.modal-overlay').classList.add('open');document.getElementById(id).classList.add('open');}
function closeAllModals(){document.querySelector('.modal-overlay').classList.remove('open');document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'));}

// ---- INIT ----
window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('app').style.display='none';
});

// ---- JOIN CLUB BY CODE ----
async function joinClubByCode(){
  const code=prompt('Enter club code:');
  if(!code)return;
  const snap=await db.collection('clubs').where('code','==',code.trim().toUpperCase()).where('school','==',currentUserData.school).get();
  if(snap.empty)return alert('No club found with that code. Check and try again.');
  const clubDoc=snap.docs[0];
  const clubData=clubDoc.data();
  if((clubData.members||[]).includes(currentUser.uid))return alert('You are already in this club!');
  await db.collection('clubs').doc(clubDoc.id).update({members:FS.arrayUnion(currentUser.uid)});
  alert(`Joined ${clubData.name}! 🎉`);
  openClubPortal(clubDoc.id);
}

// ---- ADMIN CHAT (real time — admins only) ----
function listenAdminChat(){
  if(window._adminChatUnsub){window._adminChatUnsub();}
  const chatId='adminchat_'+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  window._adminChatUnsub=db.collection('staffChats').doc(chatId).collection('messages')
    .onSnapshot(snap=>{
      const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
      const el=document.getElementById('admin-chat-messages');if(!el)return;
      el.innerHTML=msgs.length?msgs.map(m=>staffMsgHTML(m)).join(''):'<div class="empty-state">No messages yet. Start the conversation!</div>';
      el.scrollTop=el.scrollHeight;
    });
}

// ---- TEACHER CHAT (real time — teachers + admins) ----
function listenTeacherChat(){
  if(window._teacherChatUnsub){window._teacherChatUnsub();}
  const chatId='teacherchat_'+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  window._teacherChatUnsub=db.collection('staffChats').doc(chatId).collection('messages')
    .onSnapshot(snap=>{
      const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
      const el=document.getElementById('teacher-chat-messages');if(!el)return;
      el.innerHTML=msgs.length?msgs.map(m=>staffMsgHTML(m)).join(''):'<div class="empty-state">No messages yet. Start the conversation!</div>';
      el.scrollTop=el.scrollHeight;
    });
}

function staffMsgHTML(m){
  const isMe=m.uid===currentUser.uid;
  const time=m.sentAt?.toDate?m.sentAt.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  return`<div class="chat-msg ${isMe?'me':'other'}" style="margin-bottom:10px;">
    ${!isMe?`<div class="chat-msg-sender" style="font-size:11px;color:var(--gray);margin-bottom:2px;">${m.name}${m.isAdmin?' ⚡':''}</div>`:''}
    <div class="chat-msg-bubble">${m.text}</div>
    <div style="font-size:10px;color:var(--gray);margin-top:2px;text-align:${isMe?'right':'left'};">${time}</div>
  </div>`;
}

async function sendStaffMsg(type){
  const inputId=type==='admin'?'admin-chat-input':'teacher-chat-input';
  const input=document.getElementById(inputId);
  if(!input||!input.value.trim())return;
  const text=input.value.trim();
  input.value='';
  const chatId=(type==='admin'?'adminchat_':'teacherchat_')+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  await db.collection('staffChats').doc(chatId).collection('messages').add({
    text,uid:currentUser.uid,name:currentUserData.name,
    isAdmin:currentUserData.isAdmin||false,
    isTeacher:currentUserData.isTeacher||false,
    sentAt:FS.serverTimestamp()
  });
}

// Start listening when navigating to staff chats
// staff chat nav handled in original nav function above

// ============================================================
// FILE UPLOADS VIA CLOUDINARY
// ============================================================
const CLOUDINARY_CLOUD = 'dkdf38mfe';
const CLOUDINARY_PRESET = 'scholarsync';

// Upload file to Cloudinary, returns url
async function uploadToCloudinary(file, type='image'){
  const url=`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${type}/upload`;
  const fd=new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res=await fetch(url, {method:'POST', body:fd});
  const data=await res.json();
  if(data.error)throw new Error(data.error.message);
  return{url:data.secure_url, type, publicId:data.public_id, format:data.format, duration:data.duration||null};
}

// ---- SHARED CHAT SEND WITH MEDIA ----
async function sendChatMsgWithMedia(chatCollection, chatId, text, file, msgElId, inputElId){
  const input=document.getElementById(inputElId);
  const sendBtn=input?.parentElement?.querySelector('button');
  if(sendBtn)sendBtn.disabled=true;
  try{
    let mediaUrl=null, mediaType=null, mediaDuration=null;
    if(file){
      const isAudio=file.type.startsWith('audio/');
      const isVideo=file.type.startsWith('video/');
      const uploadType=isAudio||isVideo?'video':'image';
      const result=await uploadToCloudinary(file, uploadType);
      mediaUrl=result.url;
      mediaType=isAudio?'audio':isVideo?'video':'image';
      mediaDuration=result.duration;
    }
    if(!text&&!mediaUrl)return;
    await db.collection(chatCollection).doc(chatId).collection('messages').add({
      text:text||'',
      mediaUrl:mediaUrl||null,
      mediaType:mediaType||null,
      mediaDuration:mediaDuration||null,
      uid:currentUser.uid,
      name:currentUserData.name,
      sentAt:FS.serverTimestamp()
    });
    if(chatCollection==='chats'){
      await db.collection(chatCollection).doc(chatId).update({lastMessage:mediaUrl?`📎 ${mediaType==='image'?'Image':mediaType==='audio'?'Voice note':'Video'}`:text});
    }
    if(input)input.value='';
    // clear file preview
    const preview=document.getElementById('file-preview-'+msgElId);
    if(preview){preview.innerHTML='';preview.style.display='none';}
    window._pendingFile=null;
  }catch(e){alert('Upload failed: '+e.message);}
  finally{if(sendBtn)sendBtn.disabled=false;}
}

// ---- CHAT MESSAGE HTML WITH MEDIA ----
function chatMsgWithMediaHTML(m, currentUid){
  const isMe=m.uid===currentUid;
  const time=m.sentAt?.toDate?m.sentAt.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  let mediaHTML='';
  if(m.mediaUrl){
    if(m.mediaType==='image'){
      mediaHTML=`<div style="margin-top:6px;"><img src="${m.mediaUrl}" style="max-width:220px;max-height:220px;border-radius:10px;cursor:pointer;display:block;" onclick="window.open('${m.mediaUrl}','_blank')" loading="lazy"></div>`;
    }else if(m.mediaType==='audio'){
      mediaHTML=`<div style="margin-top:6px;"><audio controls style="max-width:220px;border-radius:8px;"><source src="${m.mediaUrl}"></audio></div>`;
    }else if(m.mediaType==='video'){
      mediaHTML=`<div style="margin-top:6px;"><video controls style="max-width:220px;border-radius:10px;"><source src="${m.mediaUrl}"></video></div>`;
    }
  }
  return`<div class="chat-msg ${isMe?'me':'other'}" style="margin-bottom:8px;">
    ${!isMe?`<div class="chat-msg-sender">${m.name}</div>`:''}
    <div class="chat-msg-bubble">
      ${m.text?`<div>${m.text}</div>`:''}
      ${mediaHTML}
      <div style="font-size:10px;opacity:0.6;margin-top:3px;text-align:right;">${time}</div>
    </div>
  </div>`;
}

// ---- CHAT INPUT BAR WITH MEDIA BUTTONS ----
function chatInputBarHTML(sendFn, inputId, previewId){
  return`
    <div id="${previewId}" style="display:none;padding:8px 12px;background:var(--card2);border-top:1px solid var(--border);"></div>
    <div class="chat-input-area" style="padding:8px;gap:6px;">
      <label style="cursor:pointer;color:var(--gray);display:flex;align-items:center;padding:0 4px;" title="Send image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        <input type="file" accept="image/*" style="display:none;" onchange="previewFile(this,'${previewId}')">
      </label>
      <label style="cursor:pointer;color:var(--gray);display:flex;align-items:center;padding:0 4px;" title="Send file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" style="display:none;" onchange="previewFile(this,'${previewId}')">
      </label>
      <button onclick="toggleVoiceRecorder('${inputId}','${previewId}')" style="background:none;border:none;color:var(--gray);cursor:pointer;padding:0 4px;display:flex;align-items:center;" title="Voice note" id="voice-btn-${inputId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
      </button>
      <input class="chat-input" placeholder="Message..." id="${inputId}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();${sendFn};}">
      <button class="chat-send" onclick="${sendFn}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>
      </button>
    </div>`;
}

function previewFile(input, previewId){
  const file=input.files[0];if(!file)return;
  window._pendingFile=file;
  const preview=document.getElementById(previewId);if(!preview)return;
  preview.style.display='';
  if(file.type.startsWith('image/')){
    const reader=new FileReader();
    reader.onload=e=>{preview.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><img src="${e.target.result}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"><div style="flex:1;font-size:12px;color:var(--gray);">${file.name}</div><button onclick="clearFilePreview('${previewId}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button></div>`;};
    reader.readAsDataURL(file);
  }else{
    preview.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><div style="font-size:24px;">📎</div><div style="flex:1;font-size:12px;color:var(--gray);">${file.name}</div><button onclick="clearFilePreview('${previewId}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button></div>`;
  }
}

function clearFilePreview(previewId){
  const preview=document.getElementById(previewId);
  if(preview){preview.innerHTML='';preview.style.display='none';}
  window._pendingFile=null;
}

// ---- VOICE RECORDER ----
let _mediaRecorder=null;let _audioChunks=[];let _isRecording=false;
async function toggleVoiceRecorder(inputId, previewId){
  const btn=document.getElementById('voice-btn-'+inputId);
  if(_isRecording){
    _mediaRecorder?.stop();
    _isRecording=false;
    if(btn)btn.style.color='var(--gray)';
  }else{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      _audioChunks=[];
      _mediaRecorder=new MediaRecorder(stream);
      _mediaRecorder.ondataavailable=e=>_audioChunks.push(e.data);
      _mediaRecorder.onstop=()=>{
        const blob=new Blob(_audioChunks,{type:'audio/webm'});
        const file=new File([blob],'voice-note.webm',{type:'audio/webm'});
        window._pendingFile=file;
        stream.getTracks().forEach(t=>t.stop());
        const preview=document.getElementById(previewId);
        if(preview){
          preview.style.display='';
          const url=URL.createObjectURL(blob);
          preview.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><audio controls style="flex:1;max-width:200px;"><source src="${url}"></audio><div style="font-size:12px;color:var(--gray);">Voice note</div><button onclick="clearFilePreview('${previewId}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button></div>`;
        }
      };
      _mediaRecorder.start();
      _isRecording=true;
      if(btn)btn.style.color='var(--red)';
      alert('Recording... tap the mic again to stop.');
    }catch(e){alert('Could not access microphone: '+e.message);}
  }
}

// ---- OVERRIDE openChat TO USE MEDIA INPUT BAR ----
async function openChat(id){
  currentChat=id;
  const chatSnap=await db.collection('chats').doc(id).get();if(!chatSnap.exists)return;
  const chat=chatSnap.data();
  const chatPanel=document.getElementById('chat-main-panel');
  const previewId='file-preview-chat';
  chatPanel.innerHTML=`
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:15px;font-weight:600;color:var(--white);">${chat.name}</div>
    <div class="chat-messages" id="chat-messages" style="flex:1;overflow-y:auto;padding:14px;"></div>
    ${chatInputBarHTML(`sendGroupChatMsg('${id}','${previewId}')`, 'chat-input', previewId)}
  `;
  if(window._chatMsgUnsub){window._chatMsgUnsub();}
  window._chatMsgUnsub=db.collection('chats').doc(id).collection('messages').onSnapshot(snap=>{
    const messages=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
    const el=document.getElementById('chat-messages');if(!el)return;
    el.innerHTML=messages.length?messages.map(m=>chatMsgWithMediaHTML(m,currentUser.uid)).join(''):'<div class="empty-state">No messages yet. Say something!</div>';
    el.scrollTop=el.scrollHeight;
  });
}

async function sendGroupChatMsg(chatId, previewId){
  const input=document.getElementById('chat-input');
  const text=input?.value.trim()||'';
  const file=window._pendingFile||null;
  if(!text&&!file)return;
  await sendChatMsgWithMedia('chats', chatId, text, file, previewId, 'chat-input');
}

// ---- OVERRIDE sendStaffMsg TO USE MEDIA ----
async function sendStaffMsg(type){
  const inputId=type==='admin'?'admin-chat-input':'teacher-chat-input';
  const previewId=type==='admin'?'file-preview-adminchat':'file-preview-teacherchat';
  const input=document.getElementById(inputId);
  const text=input?.value.trim()||'';
  const file=window._pendingFile||null;
  if(!text&&!file)return;
  const chatId=(type==='admin'?'adminchat_':'teacherchat_')+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  const sendBtn=input?.parentElement?.querySelector('button.chat-send');
  if(sendBtn)sendBtn.disabled=true;
  try{
    let mediaUrl=null,mediaType=null;
    if(file){
      const isAudio=file.type.startsWith('audio/');
      const uploadType=isAudio?'video':'image';
      const result=await uploadToCloudinary(file,uploadType);
      mediaUrl=result.url;mediaType=isAudio?'audio':'image';
    }
    await db.collection('staffChats').doc(chatId).collection('messages').add({
      text:text||'',mediaUrl:mediaUrl||null,mediaType:mediaType||null,
      uid:currentUser.uid,name:currentUserData.name,
      isAdmin:currentUserData.isAdmin||false,sentAt:FS.serverTimestamp()
    });
    if(input)input.value='';
    clearFilePreview(previewId);
  }catch(e){alert('Error: '+e.message);}
  finally{if(sendBtn)sendBtn.disabled=false;}
}

// ---- OVERRIDE listenAdminChat + listenTeacherChat FOR MEDIA ----
function listenAdminChat(){
  if(window._adminChatUnsub){window._adminChatUnsub();}
  const chatId='adminchat_'+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  const previewId='file-preview-adminchat';
  // Inject media input bar
  const page=document.getElementById('page-adminchat');
  if(page){
    const inputArea=page.querySelector('.chat-input-area');
    const oldInput=page.querySelector('input.chat-input');
    if(inputArea&&oldInput){
      inputArea.parentElement.innerHTML=inputArea.parentElement.innerHTML.replace(/<div class="chat-input-area"[\s\S]*?<\/div>/,chatInputBarHTML(`sendStaffMsg('admin')`, 'admin-chat-input', previewId));
    }
  }
  window._adminChatUnsub=db.collection('staffChats').doc(chatId).collection('messages').onSnapshot(snap=>{
    const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
    const el=document.getElementById('admin-chat-messages');if(!el)return;
    el.innerHTML=msgs.length?msgs.map(m=>chatMsgWithMediaHTML(m,currentUser.uid)).join(''):'<div class="empty-state">No messages yet. Start the conversation!</div>';
    el.scrollTop=el.scrollHeight;
  });
}

function listenTeacherChat(){
  if(window._teacherChatUnsub){window._teacherChatUnsub();}
  const chatId='teacherchat_'+currentUserData.school.replace(/\s+/g,'_').toLowerCase();
  window._teacherChatUnsub=db.collection('staffChats').doc(chatId).collection('messages').onSnapshot(snap=>{
    const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
    const el=document.getElementById('teacher-chat-messages');if(!el)return;
    el.innerHTML=msgs.length?msgs.map(m=>chatMsgWithMediaHTML(m,currentUser.uid)).join(''):'<div class="empty-state">No messages yet. Start the conversation!</div>';
    el.scrollTop=el.scrollHeight;
  });
}

// ---- OVERRIDE sendClubMsg FOR MEDIA ----
async function sendClubMsg(){
  if(!currentClub)return;
  const previewId='file-preview-clubchat';
  const input=document.getElementById('club-chat-input');
  const text=input?.value.trim()||'';
  const file=window._pendingFile||null;
  if(!text&&!file)return;
  await sendChatMsgWithMedia('clubs',currentClub.id,text,file,previewId,'club-chat-input');
}

// ---- OVERRIDE listenClubChat FOR MEDIA ----
function listenClubChat(clubId){
  if(window._clubChatUnsub){window._clubChatUnsub();}
  window._clubChatUnsub=db.collection('clubs').doc(clubId).collection('messages').onSnapshot(snap=>{
    const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
    const el=document.getElementById('club-messages');if(!el)return;
    el.innerHTML=msgs.length?msgs.map(m=>chatMsgWithMediaHTML(m,currentUser.uid)).join(''):'<div class="empty-state">No messages yet. Say something!</div>';
    el.scrollTop=el.scrollHeight;
  });
}

// ---- WINDOW GLOBALS ----
if(typeof ls!=="undefined")window.ls=ls;
if(typeof lsArr!=="undefined")window.lsArr=lsArr;
if(typeof genId!=="undefined")window.genId=genId;
if(typeof genPassId!=="undefined")window.genPassId=genPassId;
if(typeof pad!=="undefined")window.pad=pad;
if(typeof daysDiff!=="undefined")window.daysDiff=daysDiff;
if(typeof switchAuth!=="undefined")window.switchAuth=switchAuth;
if(typeof showAuthError!=="undefined")window.showAuthError=showAuthError;
if(typeof signIn!=="undefined")window.signIn=signIn;
if(typeof signUp!=="undefined")window.signUp=signUp;
if(typeof signOut!=="undefined")window.signOut=signOut;
if(typeof showForgot!=="undefined")window.showForgot=showForgot;
if(typeof launchApp!=="undefined")window.launchApp=launchApp;
if(typeof setupUI!=="undefined")window.setupUI=setupUI;
if(typeof nav!=="undefined")window.nav=nav;
if(typeof toggleSidebar!=="undefined")window.toggleSidebar=toggleSidebar;
if(typeof closeSidebar!=="undefined")window.closeSidebar=closeSidebar;
if(typeof toggleTheme!=="undefined")window.toggleTheme=toggleTheme;
if(typeof startClock!=="undefined")window.startClock=startClock;
if(typeof updateClock!=="undefined")window.updateClock=updateClock;
if(typeof updatePeriod!=="undefined")window.updatePeriod=updatePeriod;
if(typeof renderSchedule!=="undefined")window.renderSchedule=renderSchedule;
if(typeof tempSavePeriod!=="undefined")window.tempSavePeriod=tempSavePeriod;
if(typeof saveSchedule!=="undefined")window.saveSchedule=saveSchedule;
if(typeof populateClassDropdowns!=="undefined")window.populateClassDropdowns=populateClassDropdowns;
if(typeof renderID!=="undefined")window.renderID=renderID;
if(typeof saveID!=="undefined")window.saveID=saveID;
if(typeof loadWeather!=="undefined")window.loadWeather=loadWeather;
if(typeof renderHomework!=="undefined")window.renderHomework=renderHomework;
if(typeof hwHTML!=="undefined")window.hwHTML=hwHTML;
if(typeof addHW!=="undefined")window.addHW=addHW;
if(typeof toggleHW!=="undefined")window.toggleHW=toggleHW;
if(typeof deleteHW!=="undefined")window.deleteHW=deleteHW;
if(typeof saveNote!=="undefined")window.saveNote=saveNote;
if(typeof renderNotesList!=="undefined")window.renderNotesList=renderNotesList;
if(typeof loadNote!=="undefined")window.loadNote=loadNote;
if(typeof loadNoteItem!=="undefined")window.loadNoteItem=loadNoteItem;
if(typeof renderDeadlines!=="undefined")window.renderDeadlines=renderDeadlines;
if(typeof addDeadline!=="undefined")window.addDeadline=addDeadline;
if(typeof deleteDeadline!=="undefined")window.deleteDeadline=deleteDeadline;
if(typeof renderDashDeadlines!=="undefined")window.renderDashDeadlines=renderDashDeadlines;
if(typeof renderExams!=="undefined")window.renderExams=renderExams;
if(typeof addExam!=="undefined")window.addExam=addExam;
if(typeof deleteExam!=="undefined")window.deleteExam=deleteExam;
if(typeof setTimerMode!=="undefined")window.setTimerMode=setTimerMode;
if(typeof toggleTimer!=="undefined")window.toggleTimer=toggleTimer;
if(typeof resetTimer!=="undefined")window.resetTimer=resetTimer;
if(typeof renderFlashcards!=="undefined")window.renderFlashcards=renderFlashcards;
if(typeof filterDeck!=="undefined")window.filterDeck=filterDeck;
if(typeof addFlashcard!=="undefined")window.addFlashcard=addFlashcard;
if(typeof deleteFlashcard!=="undefined")window.deleteFlashcard=deleteFlashcard;
if(typeof deleteDeck!=="undefined")window.deleteDeck=deleteDeck;
if(typeof renderAbsences!=="undefined")window.renderAbsences=renderAbsences;
if(typeof logAbsence!=="undefined")window.logAbsence=logAbsence;
if(typeof deleteAbsence!=="undefined")window.deleteAbsence=deleteAbsence;
if(typeof renderCalendar!=="undefined")window.renderCalendar=renderCalendar;
if(typeof changeMonth!=="undefined")window.changeMonth=changeMonth;
if(typeof openCalDay!=="undefined")window.openCalDay=openCalDay;
if(typeof addCalEvent!=="undefined")window.addCalEvent=addCalEvent;
if(typeof deleteCalEvent!=="undefined")window.deleteCalEvent=deleteCalEvent;
if(typeof renderAnnouncements!=="undefined")window.renderAnnouncements=renderAnnouncements;
if(typeof postAnnouncement!=="undefined")window.postAnnouncement=postAnnouncement;
if(typeof deleteAnnouncement!=="undefined")window.deleteAnnouncement=deleteAnnouncement;
if(typeof renderClassrooms!=="undefined")window.renderClassrooms=renderClassrooms;
if(typeof openClassroom!=="undefined")window.openClassroom=openClassroom;
if(typeof listenPassPanels!=="undefined")window.listenPassPanels=listenPassPanels;
if(typeof listenPassPanels!=="undefined")window.listenPassPanels=listenPassPanels;
if(typeof passTimeBadge!=="undefined")window.passTimeBadge=passTimeBadge;
if(typeof passTimeLeft!=="undefined")window.passTimeLeft=passTimeLeft;
if(typeof passPanel!=="undefined")window.passPanel=passPanel;
if(typeof openResumeModal!=="undefined")window.openResumeModal=openResumeModal;
if(typeof resumePassWithTime!=="undefined")window.resumePassWithTime=resumePassWithTime;
if(typeof endPassTeacher!=="undefined")window.endPassTeacher=endPassTeacher;
if(typeof endPass!=="undefined")window.endPass=endPass;
if(typeof renderTPPanels!=="undefined")window.renderTPPanels=renderTPPanels;
if(typeof approvePass!=="undefined")window.approvePass=approvePass;
if(typeof denyPass!=="undefined")window.denyPass=denyPass;
if(typeof sendTeacherMsg!=="undefined")window.sendTeacherMsg=sendTeacherMsg;
if(typeof sendPassReply!=="undefined")window.sendPassReply=sendPassReply;
if(typeof sendPassReplyDesktop!=="undefined")window.sendPassReplyDesktop=sendPassReplyDesktop;
if(typeof verifyPass!=="undefined")window.verifyPass=verifyPass;
if(typeof verifyPassTeacher!=="undefined")window.verifyPassTeacher=verifyPassTeacher;
if(typeof verifyPassById!=="undefined")window.verifyPassById=verifyPassById;
if(typeof renderClassroomDetail!=="undefined")window.renderClassroomDetail=renderClassroomDetail;
if(typeof joinClass!=="undefined")window.joinClass=joinClass;
if(typeof createClass!=="undefined")window.createClass=createClass;
if(typeof postAssignment!=="undefined")window.postAssignment=postAssignment;
if(typeof switchCDTab!=="undefined")window.switchCDTab=switchCDTab;
if(typeof calcWhatIf!=="undefined")window.calcWhatIf=calcWhatIf;
if(typeof openPassRequest!=="undefined")window.openPassRequest=openPassRequest;
if(typeof selectDest!=="undefined")window.selectDest=selectDest;
if(typeof submitPassRequest!=="undefined")window.submitPassRequest=submitPassRequest;
if(typeof showActivePass!=="undefined")window.showActivePass=showActivePass;
if(typeof tickPass!=="undefined")window.tickPass=tickPass;
if(typeof updatePassTimer!=="undefined")window.updatePassTimer=updatePassTimer;
if(typeof renderClubs!=="undefined")window.renderClubs=renderClubs;
if(typeof openClubPortal!=="undefined")window.openClubPortal=openClubPortal;
if(typeof backToClubs!=="undefined")window.backToClubs=backToClubs;
if(typeof switchClubTab!=="undefined")window.switchClubTab=switchClubTab;
if(typeof listenClubChat!=="undefined")window.listenClubChat=listenClubChat;
if(typeof sendClubMsg!=="undefined")window.sendClubMsg=sendClubMsg;
if(typeof listenClubMembers!=="undefined")window.listenClubMembers=listenClubMembers;
if(typeof listenClubAnnouncements!=="undefined")window.listenClubAnnouncements=listenClubAnnouncements;
if(typeof listenClubSignup!=="undefined")window.listenClubSignup=listenClubSignup;
if(typeof addClubSignup!=="undefined")window.addClubSignup=addClubSignup;
if(typeof toggleClubSignup!=="undefined")window.toggleClubSignup=toggleClubSignup;
if(typeof postClubAnnouncement!=="undefined")window.postClubAnnouncement=postClubAnnouncement;
if(typeof createClub!=="undefined")window.createClub=createClub;
if(typeof renderSports!=="undefined")window.renderSports=renderSports;
if(typeof addSportResult!=="undefined")window.addSportResult=addSportResult;
if(typeof deleteSport!=="undefined")window.deleteSport=deleteSport;
if(typeof renderPolls!=="undefined")window.renderPolls=renderPolls;
if(typeof createPoll!=="undefined")window.createPoll=createPoll;
if(typeof castVote!=="undefined")window.castVote=castVote;
if(typeof deletePoll!=="undefined")window.deletePoll=deletePoll;
if(typeof renderDirectory!=="undefined")window.renderDirectory=renderDirectory;
if(typeof displayDir!=="undefined")window.displayDir=displayDir;
if(typeof filterDir!=="undefined")window.filterDir=filterDir;
if(typeof renderLostFound!=="undefined")window.renderLostFound=renderLostFound;
if(typeof addLF!=="undefined")window.addLF=addLF;
if(typeof deleteLF!=="undefined")window.deleteLF=deleteLF;
if(typeof renderCarpool!=="undefined")window.renderCarpool=renderCarpool;
if(typeof addCarpool!=="undefined")window.addCarpool=addCarpool;
if(typeof deleteCP!=="undefined")window.deleteCP=deleteCP;
if(typeof getChatRestriction!=="undefined")window.getChatRestriction=getChatRestriction;
if(typeof renderChats!=="undefined")window.renderChats=renderChats;
if(typeof createChat!=="undefined")window.createChat=createChat;
if(typeof deleteChat!=="undefined")window.deleteChat=deleteChat;
if(typeof renderChatModerationPanel!=="undefined")window.renderChatModerationPanel=renderChatModerationPanel;
if(typeof applyChatRestriction!=="undefined")window.applyChatRestriction=applyChatRestriction;
if(typeof liftChatRestriction!=="undefined")window.liftChatRestriction=liftChatRestriction;
if(typeof addChatMember!=="undefined")window.addChatMember=addChatMember;
if(typeof renderStudyGroups!=="undefined")window.renderStudyGroups=renderStudyGroups;
if(typeof addStudyGroup!=="undefined")window.addStudyGroup=addStudyGroup;
if(typeof joinStudyGroup!=="undefined")window.joinStudyGroup=joinStudyGroup;
if(typeof deleteSG!=="undefined")window.deleteSG=deleteSG;
if(typeof renderReminders!=="undefined")window.renderReminders=renderReminders;
if(typeof addReminder!=="undefined")window.addReminder=addReminder;
if(typeof deleteReminder!=="undefined")window.deleteReminder=deleteReminder;
if(typeof renderProfile!=="undefined")window.renderProfile=renderProfile;
if(typeof selectAvatar!=="undefined")window.selectAvatar=selectAvatar;
if(typeof saveProfile!=="undefined")window.saveProfile=saveProfile;
if(typeof approveTeacher!=="undefined")window.approveTeacher=approveTeacher;
if(typeof grantAdmin!=="undefined")window.grantAdmin=grantAdmin;
if(typeof renderApprovedTeachers!=="undefined")window.renderApprovedTeachers=renderApprovedTeachers;
if(typeof renderApprovedAdmins!=="undefined")window.renderApprovedAdmins=renderApprovedAdmins;
if(typeof removeTeacher!=="undefined")window.removeTeacher=removeTeacher;
if(typeof removeAdmin!=="undefined")window.removeAdmin=removeAdmin;
if(typeof bulkApproveTeachers!=="undefined")window.bulkApproveTeachers=bulkApproveTeachers;
if(typeof openModal!=="undefined")window.openModal=openModal;
if(typeof closeAllModals!=="undefined")window.closeAllModals=closeAllModals;
if(typeof joinClubByCode!=="undefined")window.joinClubByCode=joinClubByCode;
if(typeof listenAdminChat!=="undefined")window.listenAdminChat=listenAdminChat;
if(typeof listenTeacherChat!=="undefined")window.listenTeacherChat=listenTeacherChat;
if(typeof staffMsgHTML!=="undefined")window.staffMsgHTML=staffMsgHTML;
if(typeof sendStaffMsg!=="undefined")window.sendStaffMsg=sendStaffMsg;
if(typeof uploadToCloudinary!=="undefined")window.uploadToCloudinary=uploadToCloudinary;
if(typeof sendChatMsgWithMedia!=="undefined")window.sendChatMsgWithMedia=sendChatMsgWithMedia;
if(typeof chatMsgWithMediaHTML!=="undefined")window.chatMsgWithMediaHTML=chatMsgWithMediaHTML;
if(typeof chatInputBarHTML!=="undefined")window.chatInputBarHTML=chatInputBarHTML;
if(typeof previewFile!=="undefined")window.previewFile=previewFile;
if(typeof clearFilePreview!=="undefined")window.clearFilePreview=clearFilePreview;
if(typeof toggleVoiceRecorder!=="undefined")window.toggleVoiceRecorder=toggleVoiceRecorder;
if(typeof openChat!=="undefined")window.openChat=openChat;
if(typeof sendGroupChatMsg!=="undefined")window.sendGroupChatMsg=sendGroupChatMsg;
if(typeof sendStaffMsg!=="undefined")window.sendStaffMsg=sendStaffMsg;
if(typeof listenAdminChat!=="undefined")window.listenAdminChat=listenAdminChat;
if(typeof listenTeacherChat!=="undefined")window.listenTeacherChat=listenTeacherChat;
if(typeof sendClubMsg!=="undefined")window.sendClubMsg=sendClubMsg;
if(typeof listenClubChat!=="undefined")window.listenClubChat=listenClubChat;
if(typeof deleteClub!=="undefined")window.deleteClub=deleteClub;
