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
let currentParentData = null;
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

const SCHOOL_MASCOTS={
  'Carolina Forest High School':'Panthers',
  'Conway High School':'Tigers',
  'Myrtle Beach High School':'Sea Hawks',
  'North Myrtle Beach High School':'Chiefs',
  'Socastee High School':'Braves',
  'St. James High School':'Sharks',
  'Aynor High School':'Blue Jackets',
  'Loris High School':'Lions',
  'Green Sea Floyds High School':'Trojans',
  'Whittemore Park Middle/High School':'Tigers',
  'ATAA':'Eagles',
};
let cachedSchoolSettings=null;
function getMyMascot(){
  if(cachedSchoolSettings?.mascot)return cachedSchoolSettings.mascot;
  return SCHOOL_MASCOTS[currentUserData?.school]||currentUserData?.school||'Home';
}
async function loadSchoolSettingsCache(){
  if(!currentUserData?.school)return;
  const snap=await db.collection('schoolSettings').doc(currentUserData.school).get();
  cachedSchoolSettings=snap.exists?snap.data():{};
  // Re-render anything that depends on mascot/settings now that we have fresh data
  updateSportsPageHeader();
}
function updateSportsPageHeader(){
  const titleEl=document.getElementById('sports-page-title');
  const subEl=document.getElementById('sports-page-sub');
  if(titleEl)titleEl.textContent=`${getMyMascot()} Sports`;
  if(subEl)subEl.textContent=`${currentUserData?.school||''} game results`;
}
window.loadSchoolSettingsCache=loadSchoolSettingsCache;
window.updateSportsPageHeader=updateSportsPageHeader;

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
function genParentLinkCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  for(let i=0;i<8;i++)code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
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

// ---- LOCAL DATE STRING (timezone safe, avoids UTC rollover bugs) ----
function localDateStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ---- AUTH ----
function switchAuth(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>{if(!t.id?.startsWith('parent-'))t.classList.remove('active');});
  document.querySelector(`[onclick="switchAuth('${tab}')"]`).classList.add('active');
  document.getElementById('signin-form').style.display=tab==='signin'?'':'none';
  document.getElementById('signup-form').style.display=tab==='signup'?'':'none';
  document.getElementById('parent-form').style.display=tab==='parent'?'':'none';
  document.getElementById('auth-error').style.display='none';
}
function switchParentAuth(tab){
  document.getElementById('parent-signin-tab').classList.toggle('active',tab==='signin');
  document.getElementById('parent-signup-tab').classList.toggle('active',tab==='signup');
  document.getElementById('parent-signin-section').style.display=tab==='signin'?'':'none';
  document.getElementById('parent-signup-section').style.display=tab==='signup'?'':'none';
  document.getElementById('auth-error').style.display='none';
}
window.switchParentAuth=switchParentAuth;
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
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    const uid=cred.user.uid;
    const FOUNDER='mykahsheppard@g.horrycountyschools.net';
    const isFounder=email.toLowerCase()===FOUNDER;

    // Check if Mykah has pre-granted this email admin or teacher access
    const rolesSnap=await db.collection('schoolRoles').doc(school).get();
    const rolesData=rolesSnap.exists?rolesSnap.data():{};
    const grantedTeachers=rolesData.teachers||[];
    const grantedAdmins=rolesData.admins||[];
    const isGrantedTeacher=grantedTeachers.includes(email.toLowerCase());
    const isGrantedAdmin=grantedAdmins.includes(email.toLowerCase());

    // ONLY Mykah OR pre-granted users get elevated roles — EVERYONE ELSE = student
    const isAdmin=isFounder||isGrantedAdmin;
    const isTeacher=isAdmin||isGrantedTeacher;

    const userData={
      uid,name,email:email.toLowerCase(),school,grade,
      role:isTeacher?'teacher':'student',
      isAdmin,isTeacher,
      avatar:'linear-gradient(135deg,#1a56db,#3b82f6)',
      parentLinkCode:genParentLinkCode(),
      createdAt:FS.serverTimestamp()
    };
    await db.collection('users').doc(uid).set(userData);

    // Launch app immediately
    currentUser=cred.user;
    currentUserData=userData;
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('app').style.display='';
    launchApp();
  }catch(e){
    const msgs={
      'auth/email-already-in-use':'Account already exists. Please sign in instead.',
      'auth/weak-password':'Password must be at least 6 characters.',
      'auth/invalid-email':'Invalid email address.'
    };
    showAuthError(msgs[e.code]||'Sign up failed. Try again.');
  }
}

async function parentSignUp(){
  const name=document.getElementById('psu-name').value.trim();
  const email=document.getElementById('psu-email').value.trim();
  const pass=document.getElementById('psu-password').value;
  if(!name||!email||!pass)return showAuthError('Please fill in all fields.');
  if(pass.length<6)return showAuthError('Password must be at least 6 characters.');
  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    const uid=cred.user.uid;
    const parentData={
      uid,name,email:email.toLowerCase(),
      linkedStudents:[], // array of {studentUid, studentName, school}
      createdAt:FS.serverTimestamp()
    };
    await db.collection('parents').doc(uid).set(parentData);
    currentUser=cred.user;
    currentParentData=parentData;
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('parent-app').style.display='';
    launchParentPortal();
  }catch(e){
    const msgs={
      'auth/email-already-in-use':'Account already exists. Please sign in instead.',
      'auth/weak-password':'Password must be at least 6 characters.',
      'auth/invalid-email':'Invalid email address.'
    };
    showAuthError(msgs[e.code]||'Sign up failed. Try again.');
  }
}

function parentSignIn(){
  const email=document.getElementById('psi-email').value.trim();
  const pass=document.getElementById('psi-password').value;
  if(!email||!pass)return showAuthError('Please fill in all fields.');
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(()=>{
    return auth.signInWithEmailAndPassword(email,pass);
  }).catch(e=>{
    const msgs={'auth/user-not-found':'No account found.','auth/wrong-password':'Wrong password.','auth/invalid-credential':'Invalid email or password.'};
    showAuthError(msgs[e.code]||'Sign in failed. Try again.');
  });
}
window.parentSignUp=parentSignUp;
window.parentSignIn=parentSignIn;

async function signOut(){
  const footer=document.getElementById('app-footer');
  if(footer)footer.style.display='none';
  unsubscribers.forEach(u=>u());unsubscribers=[];
  await auth.signOut();
  currentUser=null;currentUserData=null;currentParentData=null;
  const parentApp=document.getElementById('parent-app');
  if(parentApp)parentApp.style.display='none';
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
    // Always fetch fresh user data from Firestore — never trust cache
    const snap=await db.collection('users').doc(user.uid).get();
    if(snap.exists){
      currentUserData=snap.data();
      // Double-check roles against schoolRoles collection
      const rolesSnap=await db.collection('schoolRoles').doc(currentUserData.school).get();
      if(rolesSnap.exists){
        const rolesData=rolesSnap.data();
        const isGrantedAdmin=(rolesData.admins||[]).includes(currentUserData.email?.toLowerCase());
        const isGrantedTeacher=(rolesData.teachers||[]).includes(currentUserData.email?.toLowerCase());
        const isFounder=currentUserData.email?.toLowerCase()==='mykahsheppard@g.horrycountyschools.net';
        const isAdmin=isFounder||isGrantedAdmin;
        const isTeacher=isAdmin||isGrantedTeacher;
        // Update if roles changed
        if(currentUserData.isAdmin!==isAdmin||currentUserData.isTeacher!==isTeacher){
          await db.collection('users').doc(user.uid).update({isAdmin,isTeacher,role:isTeacher?'teacher':'student'});
          currentUserData={...currentUserData,isAdmin,isTeacher,role:isTeacher?'teacher':'student'};
        }
      }
      document.getElementById('auth-screen').style.display='none';
      document.getElementById('app').style.display='';
      launchApp();
    }else{
      // Not a student/teacher/admin account — check if this is a parent account instead
      const parentSnap=await db.collection('parents').doc(user.uid).get();
      if(parentSnap.exists){
        currentParentData=parentSnap.data();
        document.getElementById('auth-screen').style.display='none';
        document.getElementById('parent-app').style.display='';
        launchParentPortal();
      }else{
        // No matching account at all — likely removed by an admin via "Remove from School".
        // Sign them out cleanly so they land back on the auth screen and can sign up again.
        alert('Your account is no longer associated with a school. Please sign up again.');
        await auth.signOut();
        document.getElementById('auth-screen').style.display='flex';
        document.getElementById('app').style.display='none';
      }
    }
  }else{
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('app').style.display='none';
    const parentApp=document.getElementById('parent-app');
    if(parentApp)parentApp.style.display='none';
  }
});

// ---- LAUNCH ----
function launchApp(){
  const footer=document.getElementById('app-footer');
  if(footer)footer.style.display='';
  setupUI();startClock();renderSchedule();renderID();loadWeather();
  initPushNotifications();
  renderHomework();renderDeadlines();renderExams();renderFlashcards();renderAbsences();
  initCalendar();renderAnnouncements();renderClassrooms();renderClubs();
  renderSports();renderPolls();renderDirectory();renderLostFound();
  renderCarpool();renderChats();renderStudyGroups();renderReminders();renderProfile();initNotificationBadges();renderActivityFeed();initNotificationListeners();updateStatusDisplay();
  listenMyActivePassGlance();updateNextClass();setInterval(updateNextClass,60000);
  syncClassroomDeadlines();
  loadSchoolSettingsCache();
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
  ensureParentLinkCode();
  const av=document.getElementById('sidebar-avatar');
  if(u.photoURL){
    av.style.backgroundImage=`url(${u.photoURL})`;
    av.style.backgroundSize='cover';
    av.style.backgroundPosition='center';
    av.textContent='';
  }else{
    av.textContent=u.name[0].toUpperCase();
    av.style.background=u.avatar||'linear-gradient(135deg,#1a56db,#3b82f6)';
  }
  if(u.isAdmin){document.querySelectorAll('.admin-only').forEach(el=>el.style.display='');document.getElementById('admin-panel').style.display='';}
  if(u.isTeacher||u.isAdmin){document.querySelectorAll('.teacher-only').forEach(el=>el.style.display='');document.getElementById('teacher-panel-btn').style.display='';}
  const savedTheme=ls('ss_theme');
  if(savedTheme==='light'){document.body.classList.add('light-mode');document.getElementById('theme-label').textContent='Dark Mode';}
  // Apply saved accent color
  if(u.accentColor)applyAccentColor(u.accentColor);
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
  if(page==='elections'){renderElections();}
  if(page==='gpa'){renderGPA();}
  if(page==='dashboard')updateDashboardStats();
  if(page==='notes'){closeNotesDeck();renderNotesDecks();}
  if(page==='studytimer')renderStudyStats();
  if(page==='tips')renderTipLine();
  if(page==='newspaper')renderNewspaper();
  if(page==='leaderboard')renderLeaderboard();
  if(page==='adminchat'){
    if(!currentUserData?.isAdmin){nav('today');return;}
    listenAdminChat();
  }
  if(page==='teacherchat'){
    if(!currentUserData?.isTeacher&&!currentUserData?.isAdmin){nav('today');return;}
    listenTeacherChat();
  }
  if(page==='teacherpanel'&&(currentUserData?.isTeacher||currentUserData?.isAdmin))renderTPPanels();
  if(page==='adminpanel'){
    if(!currentUserData?.isAdmin){nav('today');return;}
    nav('profile');
    setTimeout(()=>{const ap=document.getElementById('admin-panel');if(ap)ap.scrollIntoView({behavior:'smooth'});},100);
    return;
  }
  if(page==='schoolsetup'&&!currentUserData?.isAdmin){nav('today');return;}
  if(page==='schoolsetup')renderSchoolSetup();
  if(page==='helpguide')renderHelpGuide();
  if(page==='reports'&&!(currentUserData?.isTeacher||currentUserData?.isAdmin)){nav('today');return;}
  if(page==='reports')renderReportsPage();
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
  const av=document.getElementById('id-avatar');
  if(currentUserData.photoURL){
    av.style.backgroundImage=`url(${currentUserData.photoURL})`;
    av.style.backgroundSize='cover';av.style.backgroundPosition='center';av.textContent='';
  }else{
    av.textContent=currentUserData.name[0].toUpperCase();av.style.background=currentUserData.avatar;av.style.backgroundImage='';
  }
  const bc=document.getElementById('id-barcode');bc.innerHTML='';
  for(let i=0;i<50;i++){const s=document.createElement('span');s.style.cssText=`width:${[1,1,2,2,1,3][Math.floor(Math.random()*6)]}px;height:${16+Math.random()*16}px;display:inline-block;`;bc.appendChild(s);}
  // Functional QR code with name, school, email, ID number
  const qrWrap=document.getElementById('id-qr-wrap');
  if(qrWrap&&window.QRCode){
    qrWrap.innerHTML='';
    const qrData=`Name: ${currentUserData.name}\nSchool: ${currentUserData.school}\nEmail: ${currentUserData.email}\nStudent ID: ${idData.idNumber||'Not set'}`;
    new QRCode(qrWrap,{text:qrData,width:100,height:100,colorDark:'#000000',colorLight:'#ffffff'});
  }
}
function saveID(){const grade=document.getElementById('id-grade-input').value;const idNumber=document.getElementById('id-num-input').value.trim();ls('ss_idCard',{grade,idNumber});document.getElementById('id-grade-display').textContent=grade||'—';document.getElementById('id-num-display').textContent=idNumber||'—';alert('ID saved!');renderID();}

// ---- WEATHER ----
const SCHOOL_COORDS={
  'Carolina Forest High School':{lat:33.7468,lon:-78.9714,city:'Myrtle Beach, SC'},
  'Conway High School':{lat:33.8359,lon:-79.0473,city:'Conway, SC'},
  'Myrtle Beach High School':{lat:33.6891,lon:-78.8867,city:'Myrtle Beach, SC'},
  'North Myrtle Beach High School':{lat:33.8128,lon:-78.6814,city:'North Myrtle Beach, SC'},
  'Socastee High School':{lat:33.6826,lon:-79.0153,city:'Myrtle Beach, SC'},
  'St. James High School':{lat:33.6276,lon:-79.0850,city:'Murrells Inlet, SC'},
  'Aynor High School':{lat:33.9851,lon:-79.1948,city:'Aynor, SC'},
  'Loris High School':{lat:34.0537,lon:-78.8917,city:'Loris, SC'},
  'Green Sea Floyds High School':{lat:34.0612,lon:-79.0492,city:'Green Sea, SC'},
  'Whittemore Park Middle/High School':{lat:34.0537,lon:-78.8917,city:'Conway, SC'},
  'ATAA':{lat:33.6891,lon:-78.8867,city:'Myrtle Beach, SC'},
};

async function loadWeather(){
  const card=document.getElementById('weather-card');card.innerHTML='<div class="weather-loading">Loading weather...</div>';
  const coords=SCHOOL_COORDS[currentUserData?.school]||SCHOOL_COORDS['Myrtle Beach High School'];
  try{
    const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,windspeed_10m,precipitation_probability&timezone=America/New_York&forecast_days=1`);
    const data=await res.json();const cw=data.current_weather;
    const tempF=Math.round(cw.temperature*9/5+32);
    const feelsF=Math.round((data.hourly.apparent_temperature[0]||cw.temperature)*9/5+32);
    const humidity=data.hourly.relativehumidity_2m[0]||'—';
    const wind=Math.round((data.hourly.windspeed_10m[0]||cw.windspeed)*0.621371);
    const precip=data.hourly.precipitation_probability?.[0]??'—';
    const code=cw.weathercode;
    let cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Clear';
    if(code>=1&&code<=3)cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg> Partly Cloudy';
    if(code>=51&&code<=67)cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/></svg> Rain';
    if(code>=71&&code<=77)cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5 5-5-5"/><path d="M17 17l-5-5-5 5"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M7 7l5 5 5-5"/><path d="M7 17l5-5 5 5"/></svg> Snow';
    if(code>=80&&code<=82)cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/></svg> Showers';
    if(code>=95)cond='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9"/><polyline points="13,11 9,17 15,17 11,23"/></svg> Storm';
    card.innerHTML=`<div><div class="weather-big-temp">${tempF}°F</div><div class="weather-condition">${cond}</div><div style="font-size:13px;color:var(--gray)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${coords.city}</div></div><div class="weather-details-grid"><div class="weather-detail-card"><div class="weather-detail-val">${feelsF}°</div><div class="weather-detail-label">Feels Like</div></div><div class="weather-detail-card"><div class="weather-detail-val">${humidity}%</div><div class="weather-detail-label">Humidity</div></div><div class="weather-detail-card"><div class="weather-detail-val">${wind}</div><div class="weather-detail-label">Wind mph</div></div><div class="weather-detail-card"><div class="weather-detail-val">${precip}%</div><div class="weather-detail-label">Rain Chance</div></div></div>`;
    const subEl=document.querySelector('#page-weather .page-sub');
    if(subEl)subEl.textContent=coords.city;
  }catch{card.innerHTML='<div class="weather-loading">Could not load weather.</div>';}
}

// ---- HOMEWORK ----
function renderHomework(){
  const uid=currentUser.uid;const items=lsArr('ss_homework_'+uid);
  items.sort((a,b)=>{if(!a.due&&!b.due)return 0;if(!a.due)return 1;if(!b.due)return -1;return new Date(a.due)-new Date(b.due);});
  const pending=items.filter(i=>!i.done),done=items.filter(i=>i.done);
  document.getElementById('hw-pending').innerHTML=pending.length?pending.map(hwHTML).join(''):'<div class="empty-state">No pending tasks <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>';
  document.getElementById('hw-done').innerHTML=done.length?done.map(hwHTML).join(''):'<div class="empty-state">Nothing completed yet</div>';
  const today=localDateStr();
  const dueToday=pending.filter(i=>i.due===today);
  const todayHW=document.getElementById('today-hw-list');
  if(todayHW)todayHW.innerHTML=dueToday.length?dueToday.slice(0,3).map(i=>`<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg>':''}</div><div><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}</div></div></div>`).join(''):'<div class="empty-state">No homework due today <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>';
}
function hwHTML(i){
  const dueLabel=i.due?`<span style="color:${daysDiff(i.due)<0?'#ef4444':daysDiff(i.due)===0?'#f59e0b':'var(--gray)'};margin-left:6px;">Due ${i.due}</span>`:'';
  return `<div class="hw-item"><div class="hw-checkbox${i.done?' checked':''}" onclick="toggleHW('${i.id}')">${i.done?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg>':''}</div><div style="flex:1"><div class="hw-text${i.done?' done':''}">${i.text}</div><div class="hw-class-tag">${i.cls}${dueLabel}</div></div><button class="btn-ghost btn-sm" onclick="deleteHW('${i.id}')">×</button></div>`;
}
function addHW(){const text=document.getElementById('hw-task-name').value.trim();const cls=document.getElementById('hw-task-class').value;const due=document.getElementById('hw-task-due')?.value||'';if(!text)return;const items=lsArr('ss_homework_'+currentUser.uid);items.unshift({id:genId(),text,cls,due,done:false});ls('ss_homework_'+currentUser.uid,items);renderHomework();closeAllModals();document.getElementById('hw-task-name').value='';if(document.getElementById('hw-task-due'))document.getElementById('hw-task-due').value='';}
function toggleHW(id){const items=lsArr('ss_homework_'+currentUser.uid);const item=items.find(i=>i.id===id);if(item)item.done=!item.done;ls('ss_homework_'+currentUser.uid,items);renderHomework();}
function deleteHW(id){ls('ss_homework_'+currentUser.uid,lsArr('ss_homework_'+currentUser.uid).filter(i=>i.id!==id));renderHomework();}

// ---- NOTES ----
// ---- CLASS NOTES (Block-based decks, like flashcards) ----
let currentNotesBlock=null;
function renderNotesDecks(){
  const grid=document.getElementById('notes-deck-grid');
  if(!grid)return;
  const saved=ls('ss_schedule')||{};
  const blockIndices=[1,2,4,5]; // matches PERIODS: 1st Block, 2nd Block, 3rd Block, 4th Block
  const blockLabels=['Block 1','Block 2','Block 3','Block 4'];
  grid.innerHTML=blockIndices.map((idx,i)=>{
    const className=saved['period'+idx]||blockLabels[i];
    const notes=lsArr('ss_notes_block_'+i+'_'+currentUser.uid);
    return `<div class="card" style="cursor:pointer;" onclick="openNotesBlock(${i})">
      <div class="card-label">${blockLabels[i]}</div>
      <div style="font-size:15px;font-weight:700;color:var(--white);margin:6px 0;">${className}</div>
      <div style="font-size:12px;color:var(--gray);">${notes.length} note${notes.length!==1?'s':''}</div>
    </div>`;
  }).join('');
}
function openNotesBlock(blockIdx){
  currentNotesBlock=blockIdx;
  document.querySelector('#page-notes .grid-4').style.display='none';
  document.getElementById('notes-deck-detail').style.display='';
  renderNotesEntries();
}
function closeNotesDeck(){
  currentNotesBlock=null;
  document.querySelector('#page-notes .grid-4').style.display='';
  document.getElementById('notes-deck-detail').style.display='none';
}
function renderNotesEntries(){
  if(currentNotesBlock===null)return;
  const notes=lsArr('ss_notes_block_'+currentNotesBlock+'_'+currentUser.uid).sort((a,b)=>b.createdAt-a.createdAt);
  const list=document.getElementById('notes-entries-list');
  list.innerHTML=notes.length?notes.map(n=>`
    <div class="card" style="margin-bottom:10px;">
      <div style="font-size:11px;color:var(--gray);margin-bottom:6px;">${new Date(n.createdAt).toLocaleDateString()} ${new Date(n.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div style="font-size:14px;color:var(--white);white-space:pre-wrap;">${n.text}</div>
      <button class="btn-ghost btn-sm" onclick="deleteNoteEntry('${n.id}')" style="margin-top:8px;">Delete</button>
    </div>`).join(''):'<div class="empty-state">No notes yet for this block</div>';
}
function addNoteEntry(){
  const text=document.getElementById('note-entry-text').value.trim();
  if(!text||currentNotesBlock===null)return;
  const notes=lsArr('ss_notes_block_'+currentNotesBlock+'_'+currentUser.uid);
  notes.unshift({id:genId(),text,createdAt:Date.now()});
  ls('ss_notes_block_'+currentNotesBlock+'_'+currentUser.uid,notes);
  document.getElementById('note-entry-text').value='';
  closeAllModals();
  renderNotesEntries();
  renderNotesDecks();
}
function deleteNoteEntry(id){
  if(currentNotesBlock===null)return;
  const notes=lsArr('ss_notes_block_'+currentNotesBlock+'_'+currentUser.uid).filter(n=>n.id!==id);
  ls('ss_notes_block_'+currentNotesBlock+'_'+currentUser.uid,notes);
  renderNotesEntries();
  renderNotesDecks();
}
window.renderNotesDecks=renderNotesDecks;
window.openNotesBlock=openNotesBlock;
window.closeNotesDeck=closeNotesDeck;
window.addNoteEntry=addNoteEntry;
window.deleteNoteEntry=deleteNoteEntry;

// ---- DEADLINES (fixed date calc) ----
function renderDeadlines(){
  // Pull manual deadlines + auto-synced classroom assignment deadlines
  const manual=lsArr('ss_deadlines_'+currentUser.uid).map(d=>({...d,fromClassroom:false}));
  const synced=getSyncedAssignmentDeadlines();
  const items=[...manual,...synced].sort((a,b)=>new Date(a.date)-new Date(b.date));
  document.getElementById('dl-list').innerHTML=items.length?items.map(dl=>{
    const days=daysDiff(dl.date);
    const cls=days<0?'dl-red':days<=3?'dl-red':days<=7?'dl-gold':'dl-blue';
    const label=days<0?'PAST DUE':days===0?'TODAY':days===1?'TOMORROW':`${days} days`;
    const recurLabel=dl.recurring?` • repeats ${dl.recurring}`:'';
    return`<div class="deadline-card"><div class="deadline-days ${cls}">${label}</div><div class="deadline-info"><div class="deadline-name">${dl.name}${dl.fromClassroom?' <span style="font-size:10px;color:var(--blue-light);">(from class)</span>':''}</div><div class="deadline-meta">${dl.cls} • ${dl.type} • ${dl.date}${recurLabel}</div></div>${dl.fromClassroom?'':`<button class="btn-ghost btn-sm" onclick="deleteDeadline('${dl.id}')">×</button>`}</div>`;
  }).join(''):'<div class="empty-state">No deadlines yet</div>';
  renderDashDeadlines();
  checkDeadlineReminders(items);
}
function getSyncedAssignmentDeadlines(){
  // Pull due-dated assignments from classes the student is in (cached locally for speed)
  const cached=lsArr('ss_synced_deadlines_'+currentUser.uid);
  return cached;
}
async function syncClassroomDeadlines(){
  if(!currentUserData?.school)return;
  const snap=await db.collection('classrooms').where('school','==',currentUserData.school).where('students','array-contains',currentUser.uid).get();
  const synced=[];
  snap.docs.forEach(d=>{
    const cls=d.data();
    (cls.assignments||[]).forEach(a=>{
      if(a.due){
        synced.push({id:'sync_'+d.id+'_'+a.id,name:a.name,cls:cls.name,type:a.category||'Assignment',date:a.due,fromClassroom:true});
      }
    });
  });
  ls('ss_synced_deadlines_'+currentUser.uid,synced);
  renderDeadlines();
}
function checkDeadlineReminders(items){
  items.forEach(dl=>{
    const days=daysDiff(dl.date);
    if(days===1){
      const key='ss_dl_reminded_'+dl.id;
      if(!ls(key)){sendPushNotif('Deadline Tomorrow',`${dl.name} is due tomorrow!`);ls(key,true);}
    }
  });
}
function addDeadline(){
  const name=document.getElementById('dl-name').value.trim();
  const cls=document.getElementById('dl-class').value;
  const type=document.getElementById('dl-type').value;
  const date=document.getElementById('dl-date').value;
  const recurring=document.getElementById('dl-recurring')?.value||'';
  if(!name||!date)return;
  const items=lsArr('ss_deadlines_'+currentUser.uid);
  items.push({id:genId(),name,cls,type,date,recurring});
  ls('ss_deadlines_'+currentUser.uid,items);
  renderDeadlines();closeAllModals();
  document.getElementById('dl-name').value='';document.getElementById('dl-date').value='';
  if(document.getElementById('dl-recurring'))document.getElementById('dl-recurring').value='';
}
function deleteDeadline(id){ls('ss_deadlines_'+currentUser.uid,lsArr('ss_deadlines_'+currentUser.uid).filter(i=>i.id!==id));renderDeadlines();}
function renderDashDeadlines(){
  const manual=lsArr('ss_deadlines_'+currentUser.uid).map(d=>({...d,fromClassroom:false}));
  const synced=getSyncedAssignmentDeadlines();
  const items=[...manual,...synced].sort((a,b)=>new Date(a.date)-new Date(b.date)).filter(d=>daysDiff(d.date)>=0&&daysDiff(d.date)<=7);
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
  checkExamReminders(items);
}
function checkExamReminders(items){
  items.forEach(ex=>{
    const days=daysDiff(ex.date);
    if(days===1){
      const key='ss_exam_reminded_'+ex.id;
      if(!ls(key)){sendPushNotif('Exam Tomorrow!',`${ex.name} (${ex.subject}) is tomorrow — good luck!`);ls(key,true);}
    }
  });
}
function addExam(){const name=document.getElementById('exam-name').value.trim();const subject=document.getElementById('exam-subject').value.trim();const date=document.getElementById('exam-date').value;if(!name||!date)return;const items=lsArr('ss_exams_'+currentUser.uid);items.push({id:genId(),name,subject,date});ls('ss_exams_'+currentUser.uid,items);renderExams();closeAllModals();document.getElementById('exam-name').value='';document.getElementById('exam-subject').value='';document.getElementById('exam-date').value='';}
function deleteExam(id){ls('ss_exams_'+currentUser.uid,lsArr('ss_exams_'+currentUser.uid).filter(i=>i.id!==id));renderExams();}

// ---- STUDY TIMER ----
function setTimerMode(mins,label,el){document.querySelectorAll('.timer-mode-row .btn-ghost').forEach(b=>b.classList.remove('active-mode'));el.classList.add('active-mode');timerMode=mins;timerSecs=mins*60;timerRunning=false;clearInterval(timerInterval);document.getElementById('timer-display').textContent=`${pad(mins)}:00`;document.getElementById('timer-label').textContent=label+' Session';document.getElementById('timer-start-btn').textContent='Start';}
function toggleTimer(){if(timerRunning){clearInterval(timerInterval);timerRunning=false;document.getElementById('timer-start-btn').textContent='Resume';}else{timerRunning=true;document.getElementById('timer-start-btn').textContent='Pause';timerInterval=setInterval(()=>{if(timerSecs<=0){clearInterval(timerInterval);timerRunning=false;timerSessions++;document.getElementById('timer-sessions').textContent=timerSessions;logStudySession(timerMode);playTimerEndSound();sendPushNotif('Study Session Complete!',`You finished a ${timerMode} minute session. Great work!`);document.getElementById('timer-start-btn').textContent='Start';timerSecs=timerMode*60;document.getElementById('timer-display').textContent=`${pad(timerMode)}:00`;return;}timerSecs--;document.getElementById('timer-display').textContent=`${pad(Math.floor(timerSecs/60))}:${pad(timerSecs%60)}`;},1000);}}
function resetTimer(){clearInterval(timerInterval);timerRunning=false;timerSecs=timerMode*60;document.getElementById('timer-display').textContent=`${pad(timerMode)}:00`;document.getElementById('timer-start-btn').textContent='Start';}
function playTimerEndSound(){
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.value=880;gain.gain.setValueAtTime(0.2,ctx.currentTime);
    osc.start();osc.stop(ctx.currentTime+0.3);
  }catch(e){}
}
function logStudySession(mins){
  const log=lsArr('ss_study_log_'+currentUser.uid);
  log.push({date:localDateStr(),minutes:mins,timestamp:Date.now()});
  ls('ss_study_log_'+currentUser.uid,log);
  renderStudyStats();
}
function renderStudyStats(){
  const el=document.getElementById('timer-stats');
  if(!el)return;
  const log=lsArr('ss_study_log_'+currentUser.uid);
  const today=localDateStr();
  const todayMins=log.filter(l=>l.date===today).reduce((s,l)=>s+l.minutes,0);
  const weekAgo=Date.now()-7*86400000;
  const weekMins=log.filter(l=>l.timestamp>weekAgo).reduce((s,l)=>s+l.minutes,0);
  el.innerHTML=`<div style="display:flex;gap:16px;font-size:13px;color:var(--gray);">
    <span><strong style="color:var(--white);">${todayMins}</strong> min today</span>
    <span><strong style="color:var(--white);">${weekMins}</strong> min this week</span>
    <span><strong style="color:var(--white);">${log.length}</strong> total sessions</span>
  </div>`;
}
window.renderStudyStats=renderStudyStats;

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
  // Get teacher-logged absences from Firestore in real time
  const unsub=db.collection('studentAbsences').where('uid','==',currentUser.uid).onSnapshot(snap=>{
    const localItems=lsArr('ss_absences_'+currentUser.uid);
    const teacherItems=snap.docs.map(d=>({id:'fs_'+d.id,...d.data(),fromTeacher:true}));
    // Merge, deduplicate by date+class
    const seen=new Set();
    const allItems=[...teacherItems,...localItems].filter(i=>{
      const key=i.date+'_'+(i.cls||'');
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const unex=allItems.filter(i=>i.type==='Unexcused').length;
    const ex=allItems.filter(i=>['Parent Excused','Medical','College Visit'].includes(i.type)).length;
    const tard=allItems.filter(i=>i.type==='Tardy').length;
    const el1=document.getElementById('abs-total');if(el1)el1.textContent=allItems.length;
    const el2=document.getElementById('abs-unex');if(el2)el2.textContent=unex;
    const el3=document.getElementById('abs-ex');if(el3)el3.textContent=ex;
    const el4=document.getElementById('abs-tard');if(el4)el4.textContent=tard;
    const el5=document.getElementById('stat-abs');if(el5)el5.textContent=unex;
    const warnings=document.getElementById('abs-warnings');
    if(warnings){warnings.innerHTML='';
      if(unex>=3)warnings.innerHTML+=`<div class="abs-warning">${ICONS.warn} ${unex} unexcused absences — AIP risk!</div>`;
      if(tard>=3)warnings.innerHTML+=`<div class="abs-warning">${ICONS.warn} ${tard} tardies = ${Math.floor(tard/3)} unexcused absence(s)</div>`;
    }
    const logEl=document.getElementById('abs-log');
    if(logEl)logEl.innerHTML=allItems.length?allItems.map(i=>{
      const bc=i.type==='Unexcused'?'badge-unex':i.type==='Tardy'?'badge-tardy':'badge-excused';
      return`<div class="abs-log-item">
        <span class="abs-type-badge ${bc}">${i.type}</span>
        <span>${i.date}</span>
        <span style="color:var(--gray)">${i.cls||'—'}</span>
        ${i.fromTeacher?`<span style="font-size:10px;color:var(--blue-light);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Teacher</span>`:''}
        ${!i.fromTeacher?`<button class="btn-ghost btn-sm" onclick="deleteAbsence('${i.id}')">×</button>`:''}
      </div>`;
    }).join(''):'<div class="empty-state">No absences logged</div>';
  },err=>{
    // Fallback to local only if Firestore fails
    console.error('Absences:',err);
    const localItems=lsArr('ss_absences_'+currentUser.uid);
    const logEl=document.getElementById('abs-log');
    if(logEl)logEl.innerHTML=localItems.length?localItems.map(i=>{
      const bc=i.type==='Unexcused'?'badge-unex':i.type==='Tardy'?'badge-tardy':'badge-excused';
      return`<div class="abs-log-item"><span class="abs-type-badge ${bc}">${i.type}</span><span>${i.date}</span><span style="color:var(--gray)">${i.cls}</span><button class="btn-ghost btn-sm" onclick="deleteAbsence('${i.id}')">×</button></div>`;
    }).join(''):'<div class="empty-state">No absences logged</div>';
  });
  unsubscribers.push(unsub);
}
function logAbsence(){const date=document.getElementById('abs-date').value;const type=document.getElementById('abs-type').value;const cls=document.getElementById('abs-class').value.trim();if(!date)return;const items=lsArr('ss_absences_'+currentUser.uid);items.unshift({id:genId(),date,type,cls});ls('ss_absences_'+currentUser.uid,items);renderAbsences();closeAllModals();}
function deleteAbsence(id){ls('ss_absences_'+currentUser.uid,lsArr('ss_absences_'+currentUser.uid).filter(i=>i.id!==id));renderAbsences();}

// ---- CALENDAR (real time + titles on dots) ----
// ---- CALENDAR (Firestore — everyone sees events) ----
let calEvents = [];
function initCalendar(){
  const unsub=db.collection('calEvents').where('school','==',currentUserData.school).onSnapshot(snap=>{
    calEvents=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderCalendar();
  });
  unsubscribers.push(unsub);
}

function renderCalendar(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent=`${months[calMonth]} ${calYear}`;
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{const el=document.createElement('div');el.className='cal-day-label';el.textContent=d;grid.appendChild(el);});
  const first=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const today=new Date();today.setHours(0,0,0,0);
  for(let i=0;i<first;i++){const div=document.createElement('div');div.className='cal-day other-month';div.textContent=new Date(calYear,calMonth,1-first+i).getDate();grid.appendChild(div);}
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${calYear}-${pad(calMonth+1)}-${pad(d)}`;
    const div=document.createElement('div');div.className='cal-day';
    const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
    if(isToday)div.classList.add('today');
    const dayEvents=[...calEvents.filter(e=>e.date===dateStr),...HOLIDAYS.filter(h=>h.date===dateStr)];
    const dayNum=document.createElement('div');dayNum.textContent=d;dayNum.style.cssText='font-size:13px;line-height:1;';div.appendChild(dayNum);
    if(dayEvents.length){
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
  const dayEvents=[...calEvents.filter(e=>e.date===date),...HOLIDAYS.filter(h=>h.date===date)];
  document.getElementById('cal-modal-events').innerHTML=dayEvents.length?dayEvents.map(e=>{
    const rsvps=e.rsvps||[];
    const isRSVPd=rsvps.includes(currentUser.uid);
    const isSchoolOrClub=e.type==='school'||e.type==='club';
    return`
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <span style="font-size:10px;background:rgba(59,130,246,.15);color:var(--blue-light);padding:1px 6px;border-radius:8px;margin-right:6px;">${e.type||'event'}</span>
          ${e.title||e.type}${e.recurring?` <span style="font-size:10px;color:var(--gray);">(repeats ${e.recurring})</span>`:''}
          ${e.postedByName?`<div style="font-size:11px;color:var(--gray);">by ${e.postedByName}</div>`:''}
        </div>
        ${e.uid===currentUser.uid||currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteCalEvent('${e.id}')">×</button>`:''}
      </div>
      ${e.id&&isSchoolOrClub?`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
        <button class="btn-ghost btn-sm" onclick="toggleEventRSVP('${e.id}')">${isRSVPd?'✓ Going':'RSVP'}</button>
        <span style="font-size:11px;color:var(--gray);">${rsvps.length} going</span>
      </div>
      ${currentUserData.isAdmin&&rsvps.length?`<button class="btn-ghost btn-sm" style="margin-top:4px;" onclick="viewRSVPList('${e.id}')">View Attendee List</button>`:''}
      `:''}
    </div>`;
  }).join(''):'<div class="empty-state" style="padding:8px 0;">No events</div>';
  openModal('cal-modal');
}

async function toggleEventRSVP(eventId){
  const event=calEvents.find(e=>e.id===eventId);
  if(!event)return;
  const rsvps=event.rsvps||[];
  if(rsvps.includes(currentUser.uid)){
    await db.collection('calEvents').doc(eventId).update({rsvps:FS.arrayRemove(currentUser.uid)});
  }else{
    await db.collection('calEvents').doc(eventId).update({rsvps:FS.arrayUnion(currentUser.uid)});
  }
  setTimeout(()=>openCalDay(selectedCalDate,document.getElementById('cal-modal-title').textContent.replace('Events for ','')),300);
}

async function viewRSVPList(eventId){
  const event=calEvents.find(e=>e.id===eventId);
  if(!event||!event.rsvps?.length)return alert('No attendees yet.');
  const userSnaps=await Promise.all(event.rsvps.map(uid=>db.collection('users').doc(uid).get()));
  const names=userSnaps.filter(s=>s.exists).map(s=>s.data().name).join('\n');
  alert(`Attendees for "${event.title}":\n\n${names}`);
}

async function addCalEvent(){
  const title=document.getElementById('cal-event-title').value.trim();
  const type=document.getElementById('cal-event-type').value;
  const recurring=document.getElementById('cal-event-recurring')?.value||'';
  if(!title)return alert('Please enter an event title.');
  if(type==='school'&&!currentUserData.isAdmin)return alert('Only admins can post school-wide events.');
  await db.collection('calEvents').add({
    title,type,date:selectedCalDate,recurring,rsvps:[],
    school:currentUserData.school,
    uid:currentUser.uid,
    postedByName:currentUserData.name,
    createdAt:FS.serverTimestamp()
  });
  // If recurring, create the next 8 occurrences too (weekly) or next 30 days (daily)
  if(recurring==='weekly'){
    for(let i=1;i<=8;i++){
      const d=new Date(selectedCalDate);d.setDate(d.getDate()+i*7);
      const dateStr=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      await db.collection('calEvents').add({title,type,date:dateStr,recurring,rsvps:[],school:currentUserData.school,uid:currentUser.uid,postedByName:currentUserData.name,createdAt:FS.serverTimestamp()});
    }
  }else if(recurring==='daily'){
    for(let i=1;i<=14;i++){
      const d=new Date(selectedCalDate);d.setDate(d.getDate()+i);
      const dateStr=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      await db.collection('calEvents').add({title,type,date:dateStr,recurring,rsvps:[],school:currentUserData.school,uid:currentUser.uid,postedByName:currentUserData.name,createdAt:FS.serverTimestamp()});
    }
  }
  closeAllModals();
  document.getElementById('cal-event-title').value='';
}

async function deleteCalEvent(id){
  await db.collection('calEvents').doc(id).delete();
  closeAllModals();
}

// ---- ANNOUNCEMENTS (real time) ----
function renderAnnouncements(){
  let firstLoad=true;
  const unsub=db.collection('announcements')
    .where('school','==',currentUserData.school)
    .onSnapshot(snap=>{
      let items=snap.docs.map(d=>({id:d.id,...d.data()}));
      // Filter by grade targeting — show if no targetGrades set, or current user's grade is included
      items=items.filter(a=>!a.targetGrades||!a.targetGrades.length||a.targetGrades.includes(currentUserData.grade));
      // Sort: pinned first, then by date
      items.sort((a,b)=>{
        if(a.pinned&&!b.pinned)return -1;
        if(!a.pinned&&b.pinned)return 1;
        return (b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0);
      });
      if(!firstLoad){
        snap.docChanges().forEach(change=>{
          if(change.type==='added'){
            const data=change.doc.data();
            if(data.postedBy!==currentUser.uid){
              sendPushNotif(
                data.isEmergency?'EMERGENCY ALERT':'New Announcement',
                `${data.title} — ${data.body?.slice(0,60)}...`
              );
            }
          }
        });
      }
      firstLoad=false;
      document.getElementById('ann-list').innerHTML=items.length?items.map(a=>`
        <div class="ann-card${a.isEmergency?' emergency-alert':''}${a.pinned?' pinned-ann':''}">
          ${a.pinned?'<div style="font-size:10px;color:var(--gold);font-weight:700;margin-bottom:4px;">📌 PINNED</div>':''}
          ${a.isEmergency?'<div style="font-size:11px;color:#ef4444;font-weight:700;margin-bottom:6px;"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> EMERGENCY ALERT</div>':''}
          <div class="ann-title">${a.title}</div>
          <div class="ann-body">${a.body}</div>
          ${a.targetGrades&&a.targetGrades.length?`<div style="font-size:11px;color:var(--gray);margin-top:4px;">Targeted: ${a.targetGrades.join(', ')}</div>`:''}
          <div class="ann-meta"><span>${ICONS.pin} ${a.postedByName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Just now'}</span>
          <span>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="togglePinAnnouncement('${a.id}',${!a.pinned})">${a.pinned?'Unpin':'Pin'}</button><button class="btn-ghost btn-sm" onclick="deleteAnnouncement('${a.id}')">Delete</button>`:''}</span></div>
          ${reactionsHTML(a.id,a.reactions)}
        </div>`).join(''):'<div class="empty-state">No announcements yet</div>';
      const latest=items[0];const todayAnn=document.getElementById('today-ann');
      if(todayAnn)todayAnn.innerHTML=latest?`<div style="font-size:14px;font-weight:600;margin-bottom:4px;">${latest.isEmergency?'<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ':''} ${latest.title}</div><div style="font-size:12px;color:var(--gray)">${latest.body.slice(0,100)}...</div>`:'<div class="empty-state">No announcements yet</div>';
    },err=>console.error('Announcements error:',err));
  unsubscribers.push(unsub);
}
async function togglePinAnnouncement(id,pinned){
  await db.collection('announcements').doc(id).update({pinned});
}
async function postAnnouncement(){
  if(!currentUserData.isAdmin)return;
  const title=document.getElementById('ann-title').value.trim();
  const body=document.getElementById('ann-body').value.trim();
  const targetGrades=Array.from(document.querySelectorAll('.ann-grade-cb:checked')).map(cb=>cb.value);
  if(!title||!body)return alert('Please fill in title and body.');
  try{
    await db.collection('announcements').add({title,body,postedBy:currentUser.uid,postedByName:currentUserData.name,school:currentUserData.school,targetGrades,pinned:false,createdAt:FS.serverTimestamp()});
    closeAllModals();document.getElementById('ann-title').value='';document.getElementById('ann-body').value='';
    document.querySelectorAll('.ann-grade-cb').forEach(cb=>cb.checked=false);
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
  // Listen for active calls
  listenClassroomCall(id);
}

// ---- HALL PASS PANELS (fully real time, with ended-passes history) ----
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
  if(pass.status==='completed'||pass.status==='expired') return `<span style="background:rgba(100,116,139,.15);color:#94a3b8;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;"><svg viewBox="0 0 24 24" fill="#64748b" width="12" height="12" style="vertical-align:middle;border-radius:50%;"><circle cx="12" cy="12" r="10"/></svg> ENDED</span>`;
  if(pass.status!=='active')return '';
  if(!pass.approvedAt)return '';
  const elapsed=Math.floor((Date.now()-(pass.approvedAt.toDate?pass.approvedAt.toDate().getTime():Date.now()))/1000);
  const totalSecs=(pass.duration*60)+(pass.extraSeconds||0);
  const remaining=totalSecs-elapsed;
  const pct=remaining/totalSecs;
  if(remaining<=0) return `<span style="background:rgba(239,68,68,.15);color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;"><svg viewBox="0 0 24 24" fill="#ef4444" width="12" height="12" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/></svg> OVERDUE</span>`;
  if(pct<=0.25) return `<span style="background:rgba(239,68,68,.1);color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;"><svg viewBox="0 0 24 24" fill="#f97316" width="12" height="12" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/></svg> RUNNING LATE</span>`;
  if(pct<=0.5) return `<span style="background:rgba(245,158,11,.15);color:#f59e0b;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;"><svg viewBox="0 0 24 24" fill="#f59e0b" width="12" height="12" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/></svg> WATCH</span>`;
  return `<span style="background:rgba(34,197,94,.15);color:#22c55e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;"><svg viewBox="0 0 24 24" fill="#22c55e" width="12" height="12" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/></svg> IN TIME</span>`;
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
async function verifyPassAdmin(){const input=document.getElementById('admin-verify-input').value.trim().replace('#','').toUpperCase();await verifyPassById(input,'admin-verify-result');}
async function verifyPassById(passId,resultElId){
  const el=document.getElementById(resultElId);if(!el)return;
  el.innerHTML='<div style="color:var(--gray);font-size:13px;">Checking...</div>';
  try{
    const snap=await db.collection('hallpasses').where('passId','==',passId).where('school','==',currentUserData.school).get();
    if(snap.empty){el.innerHTML=`<div class="verify-invalid">${ICONS.x} INVALID — Pass #${passId} does not exist.</div>`;return;}
    const pass={id:snap.docs[0].id,...snap.docs[0].data()};
    const badge=passTimeBadge(pass);
    let statusHTML='';
    if(pass.status==='active')statusHTML=`<div class="verify-valid">${ICONS.check} VALID — Pass #${passId} is active. ${badge}<br><strong>Destination:</strong> ${pass.destination}<br><strong>Duration:</strong> ${pass.duration} min ${passTimeLeft(pass)}</div>`;
    else if(pass.status==='completed'||pass.used)statusHTML=`<div class="verify-expired">${ICONS.warn} EXPIRED — Pass #${passId} already used.</div>`;
    else if(pass.status==='pending')statusHTML=`<div class="verify-expired">${ICONS.clock} PENDING — Pass #${passId} awaiting approval.</div>`;
    else if(pass.status==='denied')statusHTML=`<div class="verify-invalid">${ICONS.x} DENIED — Pass #${passId} was denied.</div>`;

    // Pull up student's digital ID alongside the pass status
    let idHTML='';
    try{
      const userSnap=await db.collection('users').where('uid','==',pass.studentUid).get().catch(()=>null);
      let userData=null;
      if(userSnap&&!userSnap.empty)userData=userSnap.docs[0].data();
      else{
        const userDoc=await db.collection('users').doc(pass.studentUid).get();
        if(userDoc.exists)userData=userDoc.data();
      }
      if(userData){
        const avatarHTML=userData.photoURL
          ?`<div style="width:48px;height:48px;border-radius:50%;background-image:url(${userData.photoURL});background-size:cover;background-position:center;flex-shrink:0;"></div>`
          :`<div style="width:48px;height:48px;border-radius:50%;background:${userData.avatar||'linear-gradient(135deg,#1a56db,#3b82f6)'};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;flex-shrink:0;">${userData.name[0].toUpperCase()}</div>`;
        idHTML=`<div style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px;background:var(--card2);border-radius:10px;">
          ${avatarHTML}
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--white);">${userData.name}</div>
            <div style="font-size:12px;color:var(--gray);">${userData.school} • ${userData.grade||'—'}</div>
            <div style="font-size:11px;color:var(--gray);">${userData.email}</div>
          </div>
        </div>`;
      }
    }catch(e){}
    el.innerHTML=statusHTML+idHTML;
  }catch(e){el.innerHTML=`<div class="verify-invalid">Error: ${e.message}</div>`;}
}

function renderClassroomDetail(){
  if(!currentClass)return;
  const assignments=currentClass.assignments||[];const grades=currentClass.grades||{};
  const myGrades=assignments.map(a=>({...a,grade:(grades[a.id]||{})[currentUser.uid]}));
  const scored=myGrades.filter(a=>a.grade!==undefined&&a.grade!==null);
  const avg=scored.length?Math.round(scored.reduce((s,a)=>s+(a.grade*(a.weight/100)),0)/scored.reduce((s,a)=>s+a.weight/100,0)):null;
  const gc=document.getElementById('cd-grade-circle');if(gc){gc.textContent=avg!==null?avg+'%':'—';gc.style.background=avg>=90?'#22c55e':avg>=80?'#1a56db':avg>=70?'#f59e0b':avg!==null?'#ef4444':'#1a56db';}

  // Due this week summary
  const dueThisWeekEl=document.getElementById('cd-due-this-week');
  if(dueThisWeekEl){
    const dueThisWeek=assignments.filter(a=>a.due&&daysDiff(a.due)>=0&&daysDiff(a.due)<=7).sort((a,b)=>daysDiff(a.due)-daysDiff(b.due));
    dueThisWeekEl.innerHTML=dueThisWeek.length?dueThisWeek.map(a=>{
      const days=daysDiff(a.due);
      const label=days===0?'Today':days===1?'Tomorrow':`${days} days`;
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${a.name}</span><span style="color:${days<=1?'#ef4444':'var(--gray)'};font-weight:600;">${label}</span></div>`;
    }).join(''):'<div class="empty-state">Nothing due this week</div>';
  }

  const assignmentHTML=a=>`
    <div class="assignment-row" style="flex-direction:column;align-items:stretch;margin-bottom:8px;">
      <div style="display:flex;align-items:center;">
        <div style="flex:1">
          <div class="assignment-name">${a.name}</div>
          <div style="font-size:11px;color:var(--gray)">${a.category} • Weight: ${a.weight}%${a.due?` • Due: ${a.due}`:''}</div>
          ${a.desc?`<div style="font-size:12px;color:var(--gray-light);margin-top:4px;">${a.desc}</div>`:''}
        </div>
        <div class="assignment-grade" style="color:${a.grade>=90?'#22c55e':a.grade>=70?'#3b82f6':'#ef4444'}">${a.grade!==undefined&&a.grade!==null?a.grade:'—'}</div>
      </div>
      ${a.link?`<a href="${a.link}" target="_blank" style="font-size:12px;color:var(--blue-light);margin-top:6px;display:inline-flex;align-items:center;gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> View Resource</a>`:''}
      ${a.mediaUrl&&a.mediaType==='image'?`<img src="${a.mediaUrl}" style="max-width:100%;border-radius:8px;margin-top:8px;" loading="lazy">`:''}
      ${a.mediaUrl&&a.mediaType==='video'?`<video controls style="max-width:100%;border-radius:8px;margin-top:8px;"><source src="${a.mediaUrl}"></video>`:''}
      <button id="submit-btn-${a.id}" onclick="submitHomeworkFile('${a.id}','${a.name.replace(/'/g,"\\\'")}')" style="margin-top:8px;background:rgba(59,130,246,.15);border:1px solid #3b82f6;color:#3b82f6;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;width:fit-content;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="vertical-align:middle;margin-right:4px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        Submit Work
      </button>
    </div>`;

  // Student grades tab
  const gradesList=document.getElementById('cd-assignments-list');
  if(gradesList)gradesList.innerHTML=myGrades.length?myGrades.map(assignmentHTML).join(''):'<div class="empty-state">No assignments yet</div>';

  // Teacher assignments tab — shows all assignments with delete option
  const teacherList=document.getElementById('cd-assignments-teacher-list');
  if(teacherList)teacherList.innerHTML=assignments.length?assignments.map(a=>`
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;color:var(--white);">${a.name}</div>
          <div style="font-size:12px;color:var(--gray);">${a.category} • ${a.weight}% weight${a.due?` • Due: ${a.due}`:''}</div>
          ${a.desc?`<div style="font-size:12px;color:var(--gray-light);margin-top:4px;">${a.desc}</div>`:''}
          ${a.link?`<a href="${a.link}" target="_blank" style="font-size:12px;color:var(--blue-light);margin-top:6px;display:block;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> ${a.link}</a>`:''}
        </div>
        <button class="btn-ghost btn-sm" onclick="viewSubmissions('${a.id}','${a.name.replace(/'/g,"\\\'")}')" style="margin-right:4px;">Submissions</button>
        <button class="btn-ghost btn-sm" onclick="deleteAssignment('${a.id}')">Delete</button>
      </div>
      ${a.mediaUrl&&a.mediaType==='image'?`<img src="${a.mediaUrl}" style="max-width:100%;border-radius:8px;margin-top:8px;" loading="lazy">`:''}
      ${a.mediaUrl&&a.mediaType==='video'?`<video controls style="max-width:100%;border-radius:8px;margin-top:8px;"><source src="${a.mediaUrl}"></video>`:''}
    </div>`).join(''):'<div class="empty-state">No assignments posted yet</div>';
}

async function joinClass(){
  const code=document.getElementById('join-code').value.trim().toUpperCase();
  if(!code||code.length!==6)return alert('Enter a valid 6-character code.');
  const snap=await db.collection('classrooms').where('code','==',code).where('school','==',currentUserData.school).get();
  if(snap.empty)return alert('Class not found. Check the code.');
  const classDoc=snap.docs[0];
  if((classDoc.data().students||[]).includes(currentUser.uid))return alert('Already in this class!');
  await db.collection('classrooms').doc(classDoc.id).update({students:FS.arrayUnion(currentUser.uid)});
  // Auto-add student to the Class Chat
  const chatSnap=await db.collection('chats').where('classId','==',classDoc.id).where('isClassChat','==',true).get();
  if(!chatSnap.empty){
    await db.collection('chats').doc(chatSnap.docs[0].id).update({memberEmails:FS.arrayUnion(currentUserData.email)});
  }
  closeAllModals();alert('Joined '+classDoc.data().name+'!');
}
async function createClass(){
  if(!currentUserData.isTeacher&&!currentUserData.isAdmin)return;
  const name=document.getElementById('cc-name').value.trim();
  const subject=document.getElementById('cc-subject').value.trim();
  const color=document.getElementById('cc-color').value;
  if(!name||!subject)return;
  const code=Math.random().toString(36).slice(2,8).toUpperCase();
  const classRef=await db.collection('classrooms').add({name,subject,color,code,teacherUid:currentUser.uid,teacherName:currentUserData.name,school:currentUserData.school,students:[],assignments:[],grades:{},createdAt:FS.serverTimestamp()});
  // Auto-create the Class Chat — teacher is always a member and cannot be removed
  await db.collection('chats').add({
    name:`${name} — Class Chat`,
    memberEmails:[currentUserData.email],
    school:currentUserData.school,
    classId:classRef.id,
    isClassChat:true,
    teacherEmail:currentUserData.email,
    createdAt:FS.serverTimestamp(),lastMessage:null,
    createdBy:currentUser.uid,createdByName:currentUserData.name
  });
  closeAllModals();alert('Class created! Share code: '+code);
}
async function postAssignment(){
  if(!currentClass)return;
  const name=document.getElementById('pa-name').value.trim();
  const category=document.getElementById('pa-category').value;
  const weight=parseInt(document.getElementById('pa-weight').value)||10;
  const due=document.getElementById('pa-due').value;
  const link=document.getElementById('pa-link')?.value.trim()||'';
  const desc=document.getElementById('pa-desc')?.value.trim()||'';
  if(!name)return;
  // Handle file upload if present
  let mediaUrl=null,mediaType=null;
  const fileInput=document.getElementById('pa-file');
  if(fileInput&&fileInput.files[0]){
    try{
      const file=fileInput.files[0];
      const isVideo=file.type.startsWith('video/');
      const result=await uploadToCloudinary(file,isVideo?'video':'image');
      mediaUrl=result.url;mediaType=isVideo?'video':'image';
    }catch(e){alert('File upload failed: '+e.message);return;}
  }
  const assignment={id:genId(),name,category,weight,due,link,desc,mediaUrl,mediaType,createdAt:new Date().toISOString()};
  const assignments=[...(currentClass.assignments||[]),assignment];
  await db.collection('classrooms').doc(currentClass.id).update({assignments});
  currentClass.assignments=assignments;
  renderClassroomDetail();closeAllModals();
  ['pa-name','pa-link','pa-desc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  if(fileInput)fileInput.value='';
}
function switchCDTab(tab,el){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');['grades','announcements','quiz','students','assignments','attendance','gradeentry','passes'].forEach(t=>{const el2=document.getElementById('cd-'+t+'-tab');if(el2)el2.style.display=t===tab?'':'none';});}
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
  // Real time listener for approval AND resume
  const unsub=db.collection('hallpasses').doc(ref.id).onSnapshot(snap=>{
    const data=snap.data();
    if(!data)return;
    if(data.status==='active'){
      // Show active pass screen (handles both initial approval and teacher resume)
      showActivePass({id:ref.id,...data});
      // Hide pending screen
      document.getElementById('pass-pending-screen').style.display='none';
    }
    if(data.status==='denied'){
      unsub();
      document.getElementById('pass-pending-screen').style.display='none';
      document.getElementById('pass-request-screen').style.display='';
      alert('Your pass request was denied.');
      nav('classroom');
    }
    if(data.status==='completed'){
      unsub();
      // Pass ended by teacher — go back to classroom
      clearInterval(passTimerInterval);
      activePassId=null;
      nav('classroom');
    }
    // Show teacher message as big popup for 2 minutes
    if(data.message&&data.status==='active'){
      showTeacherMessagePopup(data.message, data.approvedBy||'Teacher');
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
  passTotal=totalSecs;
  // Calculate actual remaining time based on when approved
  const elapsed=pass.approvedAt?.toDate?Math.floor((Date.now()-pass.approvedAt.toDate().getTime())/1000):0;
  passRemaining=Math.max(0,totalSecs-elapsed);
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
    const allClubs=snap.docs.map(d=>({id:d.id,...d.data()}));
    // ONLY show clubs the user is already in
    const myClubs=allClubs.filter(c=>(c.members||[]).includes(currentUser.uid)||c.president===currentUser.uid);
    const el=document.getElementById('clubs-list');if(!el)return;
    el.innerHTML=myClubs.length?myClubs.map(c=>{
      const canDelete=c.president===currentUser.uid||currentUserData.isAdmin;
      return`<div class="club-card" onclick="openClubPortal('${c.id}')">
        <div class="club-emoji">${c.emoji||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#3b82f6"/></svg>'}</div>
        <div class="club-name">${c.name}</div>
        <div class="club-desc">${c.description||''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <div class="club-role-badge">${c.president===currentUser.uid?'<svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" width="16" height="16" style="vertical-align:middle;"><path d="M2 19l2-10 5 5 3-8 3 8 5-5 2 10H2z"/><line x1="2" y1="22" x2="22" y2="22" stroke-width="2"/></svg> President':'Member'}</div>
          ${c.president===currentUser.uid||currentUserData.isAdmin?`<div style="font-size:10px;color:var(--gray);font-family:monospace;letter-spacing:2px;">CODE: ${c.code||'—'}</div>`:''}
        </div>
        ${canDelete?`<button class="btn-red btn-sm" style="margin-top:10px;width:100%;" onclick="event.stopPropagation();deleteClub('${c.id}','${c.name}')">Delete Club</button>`:''}
      </div>`;
    }).join(''):'<div class="empty-state" style="padding:40px 20px;text-align:center;"><div style="margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" width="64" height="64"><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><div style="font-size:16px;font-weight:700;color:var(--white);margin-bottom:8px;">No Clubs Yet</div><div style="font-size:13px;color:var(--gray);">Ask your club president for a code and tap Join by Code to get in!</div></div>';
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
  // If not a member, don't auto-join — tell them to use code
  if(!isMember){
    alert(`You need the club code to join ${currentClub.name}!\n\nAsk the club president for the code, then use "Join by Code" button.`);
    return;
  }
  renderClubPortal();
}

function renderClubPortal(){
  if(!currentClub)return;
  const mainContent=document.getElementById('page-clubs');
  mainContent.innerHTML=`
    <div class="page-header">
      <div>
        <button class="back-btn" onclick="backToClubs()">← Back to Clubs</button>
        <div class="page-title">${currentClub.emoji||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#3b82f6"/></svg>'} ${currentClub.name}</div>
        <div class="page-sub">${currentClub.description||''}</div>
      </div>
      ${currentClub.president===currentUser.uid?`<div style="display:flex;gap:8px;"><button class="btn-ghost" onclick="openClubRoles()"><svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" width="16" height="16" style="vertical-align:middle;"><path d="M2 19l2-10 5 5 3-8 3 8 5-5 2 10H2z"/><line x1="2" y1="22" x2="22" y2="22" stroke-width="2"/></svg> Roles</button><button class="btn-blue" onclick="openModal('club-announce-modal')">+ Announcement</button></div>`:''}
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
  listenClubChat(currentClub.id);
  listenClubMembers(currentClub.id);
  listenClubAnnouncements(currentClub.id);
  listenClubSignup(currentClub.id);
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

// (listenClubChat fully implemented further below with media support and role badges — duplicate removed)

// (sendClubMsg fully implemented below with media upload support — duplicate removed)

// (listenClubMembers fully implemented below with custom role support — duplicate removed)

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
            ${signupNames?`<div style="font-size:11px;color:var(--gray-dark);margin-top:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> ${signupNames}</div>`:''}
          </div>
          ${!expired&&!full&&!signedUp?`<button class="btn-blue btn-sm" onclick="toggleClubSignup('${s.id}','${clubId}')">Sign Up</button>`:signedUp?`<button class="btn-ghost btn-sm" onclick="toggleClubSignup('${s.id}','${clubId}')">Signed Up <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg></button>`:`<span style="font-size:11px;color:var(--gray);padding:6px 10px;">${expired?'Expired':'Full'}</span>`}
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
  const emoji=document.getElementById('club-emoji').value||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#3b82f6"/></svg>';
  if(!name)return;
  const code=Math.random().toString(36).slice(2,8).toUpperCase();
  await db.collection('clubs').add({name,description,emoji,code,president:currentUser.uid,members:[currentUser.uid],school:currentUserData.school,createdAt:FS.serverTimestamp()});
  closeAllModals();['club-name','club-desc','club-emoji'].forEach(id=>document.getElementById(id).value='');
  alert(`Club created! Join code: ${code}`);
}

// ---- SPORTS (real time) ----
function switchSportsTab(tab,el){
  document.querySelectorAll('#page-sports .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sports-results-tab').style.display=tab==='results'?'':'none';
  document.getElementById('sports-bracket-tab').style.display=tab==='bracket'?'':'none';
  document.getElementById('sports-add-result-btn').style.display=(tab==='results'&&currentUserData.isAdmin)?'':'none';
  document.getElementById('sports-add-bracket-btn').style.display=(tab==='bracket'&&currentUserData.isAdmin)?'':'none';
  if(tab==='bracket')renderBracket();
}

function renderSports(){
  updateSportsPageHeader();
  const unsub=db.collection('sports').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('sports-list').innerHTML=items.length?items.map(s=>{const result=parseInt(s.ourScore)>parseInt(s.theirScore)?'WIN':parseInt(s.ourScore)<parseInt(s.theirScore)?'LOSS':'TIE';const cls=result==='WIN'?'wlt-win':result==='LOSS'?'wlt-loss':'wlt-tie';return`<div class="sport-card"><div class="sport-header"><span class="sport-tag">${s.sport}</span><span class="wlt-badge ${cls}">${result}</span></div><div class="score-row"><div class="score-team"><div class="score-team-name">${getMyMascot()}</div><div class="score-num">${s.ourScore}</div></div><div class="score-vs">VS</div><div class="score-team"><div class="score-team-name">${s.opponent}</div><div class="score-num">${s.theirScore}</div></div></div><div style="font-size:12px;color:var(--gray);margin-top:10px;">${s.date}</div>${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" style="margin-top:8px;" onclick="deleteSport('${s.id}')">Delete</button>`:''}</div>`;}).join(''):'<div class="empty-state">No game results yet</div>';
    renderSeasonRecords(items);
  },err=>console.error('Sports:',err));
  unsubscribers.push(unsub);
}

function renderSeasonRecords(items){
  const bySport={};
  items.forEach(s=>{
    if(!bySport[s.sport])bySport[s.sport]={w:0,l:0,t:0};
    const us=parseInt(s.ourScore),them=parseInt(s.theirScore);
    if(us>them)bySport[s.sport].w++;
    else if(us<them)bySport[s.sport].l++;
    else bySport[s.sport].t++;
  });
  const el=document.getElementById('sports-season-records');
  if(!el)return;
  const sports=Object.keys(bySport);
  el.innerHTML=sports.length?sports.map(sport=>{
    const r=bySport[sport];
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${sport}</span><span style="font-weight:700;color:var(--white);">${r.w}-${r.l}${r.t?'-'+r.t:''}</span></div>`;
  }).join(''):'<div class="empty-state">No games recorded yet</div>';
}

async function renderBracket(){
  const snap=await db.collection('sportsBrackets').doc(currentUserData.school).get();
  const el=document.getElementById('sports-bracket-display');
  if(!snap.exists){el.innerHTML='<div class="empty-state">No bracket set up yet</div>';return;}
  const data=snap.data();
  const rounds=data.rounds||[];
  el.innerHTML=`<div class="card"><div class="card-label">${data.sport||'PLAYOFF'} BRACKET</div>
    <div style="display:flex;gap:20px;overflow-x:auto;padding:10px 0;">
      ${rounds.map(round=>`
        <div style="min-width:180px;">
          <div style="font-size:12px;color:var(--gray);font-weight:700;margin-bottom:8px;">${round.name}</div>
          ${round.matchups.map(m=>`
            <div style="background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:10px;">
              <div style="font-size:13px;color:${m.winner==='team1'?'#22c55e':'var(--white)'};font-weight:${m.winner==='team1'?'700':'400'};">${m.team1||'TBD'}</div>
              <div style="font-size:11px;color:var(--gray);text-align:center;">vs</div>
              <div style="font-size:13px;color:${m.winner==='team2'?'#22c55e':'var(--white)'};font-weight:${m.winner==='team2'?'700':'400'};">${m.team2||'TBD'}</div>
            </div>`).join('')}
        </div>`).join('')}
    </div>
  </div>`;
}
window.switchSportsTab=switchSportsTab;
window.renderBracket=renderBracket;
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
      const isExpired=p.expiresAt&&new Date(p.expiresAt)<new Date();
      const canVote=!voted&&!isExpired;
      const optHTML=p.options.map((opt,i)=>{const count=Object.values(p.votes||{}).filter(v=>v===i).length;const pct=totalVotes?Math.round(count/totalVotes*100):0;return`<div class="poll-opt" style="cursor:${canVote?'pointer':'default'}" onclick="${canVote?`castVote('${p.id}',${i})`:''}"><div class="poll-opt-label"><span>${opt}</span><span>${pct}%</span></div><div class="poll-bar"><div class="poll-fill" style="width:${pct}%"></div></div></div>`;}).join('');
      const expiryLabel=p.expiresAt?(isExpired?'<span style="color:#ef4444;">Closed</span>':`Closes ${new Date(p.expiresAt).toLocaleString()}`):'';
      return`<div class="poll-card"><div class="poll-q">${p.question}</div>${optHTML}<div style="font-size:12px;color:var(--gray);margin-top:8px;">${totalVotes} votes${expiryLabel?' • '+expiryLabel:''}${currentUserData.isAdmin?` • <button class="btn-ghost btn-sm" onclick="deletePoll('${p.id}')">Delete</button>`:''}</div></div>`;
    }).join(''):'<div class="empty-state">No polls yet</div>';
  },err=>console.error('Polls:',err));
  unsubscribers.push(unsub);
}
async function createPoll(){
  if(!currentUserData.isAdmin)return;
  const q=document.getElementById('poll-q').value.trim();
  const opts=['poll-o1','poll-o2','poll-o3','poll-o4'].map(id=>document.getElementById(id).value.trim()).filter(Boolean);
  const expiresAt=document.getElementById('poll-expires')?.value||null;
  if(!q||opts.length<2)return alert('Need a question and at least 2 options.');
  try{await db.collection('polls').add({question:q,options:opts,votes:{},expiresAt,school:currentUserData.school,createdAt:FS.serverTimestamp(),postedBy:currentUser.uid});closeAllModals();['poll-q','poll-o1','poll-o2','poll-o3','poll-o4'].forEach(id=>document.getElementById(id).value='');if(document.getElementById('poll-expires'))document.getElementById('poll-expires').value='';}
  catch(e){alert('Error: '+e.message);}
}
async function castVote(pollId,optIdx){
  const ref=db.collection('polls').doc(pollId);
  const snap=await ref.get();
  if(!snap.exists)return;
  const data=snap.data();
  if((data.votes||{})[currentUser.uid]!==undefined)return;
  if(data.expiresAt&&new Date(data.expiresAt)<new Date())return alert('This poll has closed.');
  await ref.update({[`votes.${currentUser.uid}`]:optIdx});
}
async function deletePoll(id){await db.collection('polls').doc(id).delete();}

// ---- DIRECTORY (real time) ----
// (renderDirectory / displayDir / filterDir fully implemented below with Follow system — duplicate removed)

// ---- LOST & FOUND (real time) ----
function renderLostFound(){
  const unsub=db.collection('lostfound').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('lf-list').innerHTML=items.length?items.map(i=>{
      const statusClass=i.status==='Lost'?'lf-lost':i.status==='Found'?'lf-found':'';
      const statusStyle=i.status==='Claimed'?'background:rgba(107,114,128,.2);color:#9ca3af;':'';
      const comments=i.comments||[];
      return`<div class="lf-card" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="lf-status-badge ${statusClass}" style="${statusStyle}">${i.status.toUpperCase()}</div>
          <div style="flex:1">
            <div class="lf-name">${i.name}</div>
            <div class="lf-loc">${i.location} • ${i.postedByName}</div>
          </div>
          ${i.postedBy===currentUser.uid||currentUserData.isAdmin?`<button class="btn-ghost btn-sm" onclick="deleteLF('${i.id}')">×</button>`:''}
        </div>
        ${i.photoUrl?`<img src="${i.photoUrl}" style="max-width:200px;border-radius:8px;margin-top:8px;" loading="lazy">`:''}
        <div style="margin-top:8px;">
          ${comments.map(c=>`<div style="font-size:12px;color:var(--gray-light);padding:4px 0;border-top:1px solid var(--border);"><strong style="color:var(--white);">${c.name}:</strong> ${c.text}</div>`).join('')}
          <div style="display:flex;gap:6px;margin-top:6px;">
            <input class="input" style="margin:0;flex:1;font-size:12px;padding:6px 10px;" placeholder="Add a comment..." id="lf-comment-${i.id}" onkeypress="if(event.key==='Enter')addLFComment('${i.id}')">
            <button class="btn-ghost btn-sm" onclick="addLFComment('${i.id}')">Send</button>
          </div>
        </div>
      </div>`;
    }).join(''):'<div class="empty-state">No items posted</div>';
  },err=>console.error('LF:',err));
  unsubscribers.push(unsub);
}
async function addLF(){
  const name=document.getElementById('lf-item').value.trim();
  const location=document.getElementById('lf-loc').value.trim();
  const status=document.getElementById('lf-status').value;
  const file=document.getElementById('lf-file').files[0];
  if(!name)return alert('Please enter an item name.');
  try{
    let photoUrl=null;
    if(file){
      const result=await uploadToCloudinary(file,'image');
      photoUrl=result.url;
    }
    await db.collection('lostfound').add({name,location,status,photoUrl,comments:[],postedBy:currentUser.uid,postedByName:currentUserData.name,school:currentUserData.school,createdAt:FS.serverTimestamp()});
    closeAllModals();
    ['lf-item','lf-loc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('lf-file').value='';
    document.getElementById('lf-file-label').textContent='No file chosen';
  }catch(e){alert('Error: '+e.message);}
}
async function deleteLF(id){await db.collection('lostfound').doc(id).delete();}
async function addLFComment(id){
  const input=document.getElementById('lf-comment-'+id);
  const text=input.value.trim();
  if(!text)return;
  await db.collection('lostfound').doc(id).update({
    comments:FS.arrayUnion({name:currentUserData.name,text,timestamp:Date.now()})
  });
  input.value='';
}
window.addLFComment=addLFComment;

// ---- CARPOOL (real time) ----
function renderCarpool(){
  const unsub=db.collection('carpool').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    document.getElementById('cp-list').innerHTML=items.length?items.map(i=>{
      const comments=i.comments||[];
      return`<div class="cp-card" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="cp-icon">${parseInt(i.seats)>0?ICONS.car:ICONS.hand}</div>
          <div style="flex:1">
            <div class="cp-area">${i.area}</div>
            <div class="cp-info">${i.contact}${i.days?` • ${i.days}`:''}</div>
          </div>
          <div class="cp-seats-badge">${parseInt(i.seats)>0?i.seats+' seats':'Looking'}</div>
          ${i.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteCP('${i.id}')">×</button>`:''}
        </div>
        <div style="margin-top:8px;">
          ${comments.map(c=>`<div style="font-size:12px;color:var(--gray-light);padding:4px 0;border-top:1px solid var(--border);"><strong style="color:var(--white);">${c.name}:</strong> ${c.text}</div>`).join('')}
          <div style="display:flex;gap:6px;margin-top:6px;">
            <input class="input" style="margin:0;flex:1;font-size:12px;padding:6px 10px;" placeholder="Add a comment..." id="cp-comment-${i.id}" onkeypress="if(event.key==='Enter')addCPComment('${i.id}')">
            <button class="btn-ghost btn-sm" onclick="addCPComment('${i.id}')">Send</button>
          </div>
        </div>
      </div>`;
    }).join(''):'<div class="empty-state">No carpool posts yet</div>';
  },err=>console.error('Carpool:',err));
  unsubscribers.push(unsub);
}
async function addCarpool(){
  const area=document.getElementById('cp-area').value.trim();
  const seats=document.getElementById('cp-seats').value;
  const days=document.getElementById('cp-days').value.trim();
  const contact=document.getElementById('cp-contact').value.trim();
  if(!area||!contact)return alert('Please fill in area and contact info.');
  try{
    await db.collection('carpool').add({area,seats:seats||'0',days,contact,comments:[],postedBy:currentUser.uid,school:currentUserData.school,createdAt:FS.serverTimestamp()});
    closeAllModals();
    ['cp-area','cp-seats','cp-days','cp-contact'].forEach(id=>document.getElementById(id).value='');
  }catch(e){alert('Error: '+e.message);}
}
async function deleteCP(id){await db.collection('carpool').doc(id).delete();}
async function addCPComment(id){
  const input=document.getElementById('cp-comment-'+id);
  const text=input.value.trim();
  if(!text)return;
  await db.collection('carpool').doc(id).update({
    comments:FS.arrayUnion({name:currentUserData.name,text,timestamp:Date.now()})
  });
  input.value='';
}
window.addCPComment=addCPComment;

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
      const daysLeft=c.isClassChat?null:Math.max(0,14-Math.floor((Date.now()-(c.createdAt?.toDate?c.createdAt.toDate().getTime():Date.now()))/86400000));
      const canDelete=!c.isClassChat&&(isStaff||c.createdBy===currentUser.uid);
      const staffBtns=isStaff&&canDelete?`<div style="display:flex;gap:4px;margin-top:6px;"><button class="btn-red btn-sm" onclick="event.stopPropagation();deleteChat('${c.id}')">Delete</button></div>`:'';
      const ownerBtn=!isStaff&&canDelete?`<div style="display:flex;gap:4px;margin-top:6px;"><button class="btn-ghost btn-sm" onclick="event.stopPropagation();deleteChat('${c.id}')">Delete</button></div>`:'';
      const classChatBadge=c.isClassChat?`<span style="font-size:9px;background:rgba(34,197,94,.15);color:#22c55e;padding:1px 6px;border-radius:8px;margin-left:4px;">CLASS CHAT</span>`:'';
      return`<div class="chat-item" onclick="openChat('${c.id}')">
        <div class="chat-item-name">${c.name}${classChatBadge}${isStaff&&c.createdByName?` <span style="font-size:10px;color:var(--gray);">by ${c.createdByName}</span>`:''}</div>
        <div class="chat-item-preview">${c.lastMessage||'No messages yet'}</div>
        <div class="chat-item-meta"><span style="font-size:10px;color:var(--gray);">${(c.memberEmails||[]).length} members</span>${daysLeft!==null?`<span class="chat-expires-badge">${daysLeft}d left</span>`:''}</div>
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
  const classId=document.getElementById('new-chat-class')?.value;
  if(!classId)return alert('Select which class this group chat belongs to.');
  // Check restriction unless staff
  if(!currentUserData.isTeacher&&!currentUserData.isAdmin){
    const restriction=await getChatRestriction();
    if(restriction){
      if(restriction.type==='banned')return alert('<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> '+restriction.reason);
      if(restriction.type==='suspended')return alert(`⏳ ${restriction.reason}\nSuspension ends: ${restriction.until.toLocaleDateString()}`);
    }
  }
  const classDoc=await db.collection('classrooms').doc(classId).get();
  if(!classDoc.exists)return alert('Class not found.');
  const classData=classDoc.data();
  // Find the teacher's email to auto-add them
  const teacherDoc=await db.collection('users').doc(classData.teacherUid).get();
  const teacherEmail=teacherDoc.exists?teacherDoc.data().email:null;
  const memberEmails=[...new Set([currentUserData.email,...chatMembers,...(teacherEmail?[teacherEmail]:[])])];
  try{
    await db.collection('chats').add({
      name,memberEmails,school:currentUserData.school,
      classId,teacherEmail,isClassChat:false,
      createdAt:FS.serverTimestamp(),lastMessage:null,
      createdBy:currentUser.uid,createdByName:currentUserData.name
    });
    chatMembers=[];document.getElementById('chat-members-list').innerHTML='';
    closeAllModals();document.getElementById('new-chat-name').value='';
  }catch(e){alert('Error: '+e.message);}
}

async function deleteChat(id){
  const chatDoc=await db.collection('chats').doc(id).get();
  if(!chatDoc.exists)return;
  const chat=chatDoc.data();
  if(chat.isClassChat)return alert('The main Class Chat cannot be deleted.');
  const isTeacherOfThisClass=currentUserData.isTeacher&&chat.teacherEmail===currentUserData.email;
  if(!currentUserData.isAdmin&&!isTeacherOfThisClass&&chat.createdBy!==currentUser.uid)return alert('You do not have permission to delete this chat.');
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
    document.getElementById('sg-list').innerHTML=items.length?items.map(s=>{const full=(s.members||[]).length>=s.spots;return`<div class="sg-card"><div class="sg-info"><div class="sg-subject">${s.subject}</div><div class="sg-details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${s.location}</div><div class="sg-details">${(s.members||[]).length}/${s.spots} spots</div></div><span class="sg-spots-badge ${full?'sg-full':'sg-open'}">${full?'FULL':'OPEN'}</span>${!full&&!(s.members||[]).includes(currentUser.uid)?`<button class="btn-blue btn-sm" onclick="joinStudyGroup('${s.id}')">Join</button>`:''} ${s.postedBy===currentUser.uid?`<button class="btn-ghost btn-sm" onclick="deleteSG('${s.id}')">×</button>`:''}</div>`;}).join(''):'<div class="empty-state">No study groups yet</div>';
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
function renderProfile(){
  const av=document.getElementById('profile-avatar-big');
  if(currentUserData.photoURL){
    av.style.backgroundImage=`url(${currentUserData.photoURL})`;
    av.style.backgroundSize='cover';
    av.style.backgroundPosition='center';
    av.textContent='';
  }else{
    av.textContent=currentUserData.name[0].toUpperCase();
    av.style.background=currentUserData.avatar;
    av.style.backgroundImage='';
  }
  document.getElementById('profile-name-input').value=currentUserData.name;
  renderAccentPicker();
  renderStatusPicker();
}
async function selectAvatar(el,gradient){document.querySelectorAll('.avatar-swatch').forEach(s=>s.classList.remove('selected'));el.classList.add('selected');document.getElementById('profile-avatar-big').style.background=gradient;await db.collection('users').doc(currentUser.uid).update({avatar:gradient});currentUserData.avatar=gradient;document.getElementById('sidebar-avatar').style.background=gradient;}
async function saveProfile(){const name=document.getElementById('profile-name-input').value.trim();if(!name)return;await db.collection('users').doc(currentUser.uid).update({name});currentUserData.name=name;document.getElementById('sidebar-name').textContent=name;document.getElementById('profile-avatar-big').textContent=name[0].toUpperCase();document.getElementById('sidebar-avatar').textContent=name[0].toUpperCase();alert('Profile saved!');}

// ---- ADMIN ----
async function approveTeacher(){
  const email=document.getElementById('teacher-email-input').value.trim().toLowerCase();
  if(!email)return alert('Enter a teacher email.');
  const school=currentUserData.school; // always use admin's own school
  try{
    await db.collection('schoolRoles').doc(school).set({teachers:FS.arrayUnion(email)},{merge:true});
    const snap=await db.collection('users').where('email','==',email).where('school','==',school).get();
    if(!snap.empty) await snap.docs[0].ref.update({isTeacher:true,role:'teacher'});
    document.getElementById('teacher-email-input').value='';
    await renderApprovedTeachers();
    alert('Teacher access granted to '+email+'!');
  }catch(e){alert('Error: '+e.message);}
}

async function grantAdmin(){
  const email=document.getElementById('admin-email-input').value.trim().toLowerCase();
  const schoolEl=document.getElementById('admin-school-input');
  const school=schoolEl?.value||currentUserData.school;
  if(!email)return alert('Enter an email address.');
  if(!school)return alert('Select a school.');
  try{
    await db.collection('schoolRoles').doc(school).set({admins:FS.arrayUnion(email),teachers:FS.arrayUnion(email)},{merge:true});
    // Update user doc directly by email — no school filter needed
    const snap=await db.collection('users').where('email','==',email).get();
    if(!snap.empty){
      await snap.docs[0].ref.update({isAdmin:true,isTeacher:true,role:'teacher'});
      alert('Admin granted to '+email+' at '+school+'! They need to sign out and back in.');
    }else{
      alert('Pre-granted admin to '+email+' at '+school+'. Will activate when they sign up.');
    }
    document.getElementById('admin-email-input').value='';
    if(schoolEl) schoolEl.value='';
    await renderApprovedAdmins();
  }catch(e){alert('Error: '+e.message);}
}
async function renderApprovedAdmins(){
  const el=document.getElementById('approved-admins-list');if(!el)return;
  const isFounder=currentUserData.email==='mykahsheppard@g.horrycountyschools.net';
  if(isFounder){
    // Show ALL admins across ALL schools
    const schools=['Carolina Forest High School','Conway High School','Myrtle Beach High School','North Myrtle Beach High School','Socastee High School','St. James High School','Aynor High School','Loris High School','Green Sea Floyds High School','Whittemore Park Middle/High School','ATAA'];
    let html='';
    for(const school of schools){
      const snap=await db.collection('schoolRoles').doc(school).get();
      const admins=snap.exists?(snap.data().admins||[]).filter(e=>e!=='mykahsheppard@g.horrycountyschools.net'):[];
      if(admins.length){
        html+=`<div style="font-size:11px;color:var(--blue-light);font-weight:700;padding:6px 0 2px;">${school}</div>`;
        html+=admins.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeAdmin('${e}')">Remove</button></div>`).join('');
      }
    }
    el.innerHTML=html||'<div style="font-size:12px;color:var(--gray);padding:6px 0;">No admins granted yet</div>';
  }else{
    const snap=await db.collection('schoolRoles').doc(currentUserData.school).get();
    const admins=snap.exists?(snap.data().admins||[]).filter(e=>e!=='mykahsheppard@g.horrycountyschools.net'):[];
    el.innerHTML=admins.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeAdmin('${e}')">Remove</button></div>`).join('')||'<div style="font-size:12px;color:var(--gray);padding:6px 0;">No admins added yet</div>';
  }
}

async function renderApprovedTeachers(){
  const snap=await db.collection('schoolRoles').doc(currentUserData.school).get();
  const data=snap.exists?snap.data():{};
  const teachers=data.teachers||[];
  const el=document.getElementById('approved-teachers-list');if(!el)return;
  el.innerHTML=teachers.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>${e}</span><button class="btn-ghost btn-sm" onclick="removeTeacher('${e}')">Remove</button></div>`).join('')||'<div style="font-size:12px;color:var(--gray);padding:6px 0;">No teachers added yet</div>';
}
async function removeAdmin(email){
  if(email==='mykahsheppard@g.horrycountyschools.net')return alert("Can't remove the founder!");
  if(!confirm('Remove admin from '+email+'?'))return;
  try{
    const snap=await db.collection('users').where('email','==',email).get();
    if(!snap.empty){
      const userDoc=snap.docs[0];
      const school=userDoc.data().school;
      await db.collection('schoolRoles').doc(school).update({admins:FS.arrayRemove(email)}).catch(()=>{});
      await userDoc.ref.update({isAdmin:false,isTeacher:false,role:'student'});
    }else{
      // Pre-granted but never signed up — remove from all schools
      const schools=['Carolina Forest High School','Conway High School','Myrtle Beach High School','North Myrtle Beach High School','Socastee High School','St. James High School','Aynor High School','Loris High School','Green Sea Floyds High School','Whittemore Park Middle/High School','ATAA'];
      await Promise.all(schools.map(s=>db.collection('schoolRoles').doc(s).update({admins:FS.arrayRemove(email)}).catch(()=>{})));
    }
    await renderApprovedAdmins();
    alert('Admin removed from '+email+'. They must sign out and back in.');
  }catch(e){alert('Error: '+e.message);}
}

async function removeTeacher(email){
  if(!confirm('Remove teacher access from '+email+'?'))return;
  try{
    const snap=await db.collection('users').where('email','==',email).get();
    if(!snap.empty){
      const userDoc=snap.docs[0];
      const school=userDoc.data().school;
      await db.collection('schoolRoles').doc(school).update({teachers:FS.arrayRemove(email)}).catch(()=>{});
      await userDoc.ref.update({isTeacher:false,role:'student'});
    }
    await renderApprovedTeachers();
    alert('Teacher access removed from '+email+'.');
  }catch(e){alert('Error: '+e.message);}
}
async function bulkApproveTeachers(){const emails=document.getElementById('bulk-teachers').value.split('\n').map(e=>e.trim().toLowerCase()).filter(Boolean);const school=currentUserData.school;for(const email of emails){await db.collection('schoolRoles').doc(school).set({teachers:FS.arrayUnion(email)},{merge:true});const snap=await db.collection('users').where('email','==',email).where('school','==',school).get();if(!snap.empty)await db.collection('users').doc(snap.docs[0].id).update({isTeacher:true,role:'teacher'});}renderApprovedTeachers();document.getElementById('bulk-teachers').value='';alert(`${emails.length} teachers granted access!`);}

// ---- MODALS ----
function openModal(id){document.querySelector('.modal-overlay').classList.add('open');document.getElementById(id).classList.add('open');if(id==='quiz-build-modal'){quizBuilderQuestions=[];renderQuizBuilderFields();}if(id==='chat-modal'){populateChatClassDropdown();}if(id==='sport-modal'){populateSportTypeDropdown();}}
async function populateSportTypeDropdown(){
  const el=document.getElementById('sport-type');
  if(!el)return;
  if(cachedSchoolSettings?.sports?.length){
    el.innerHTML=cachedSchoolSettings.sports.map(s=>`<option>${s}</option>`).join('');
  }
}
window.populateSportTypeDropdown=populateSportTypeDropdown;
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
  if((clubData.members||[]).includes(currentUser.uid)||clubData.president===currentUser.uid){
    // Already a member — just open portal
    currentClub={id:clubDoc.id,...clubData};
    renderClubPortal();
    return;
  }
  await db.collection('clubs').doc(clubDoc.id).update({members:FS.arrayUnion(currentUser.uid)});
  alert(`Joined ${clubData.name}! <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`);
  currentClub={id:clubDoc.id,...clubData,members:[...(clubData.members||[]),currentUser.uid]};
  renderClubPortal();
}

// ---- ADMIN CHAT (real time — admins only) ----
// (listenAdminChat fully implemented below with media support and dynamic input bar injection — duplicate removed)

// ---- TEACHER CHAT (real time — teachers + admins) ----
// (listenTeacherChat fully implemented below with media support — duplicate removed)

function staffMsgHTML(m){
  const isMe=m.uid===currentUser.uid;
  const time=m.sentAt?.toDate?m.sentAt.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  return`<div class="chat-msg ${isMe?'me':'other'}" style="margin-bottom:10px;">
    ${!isMe?`<div class="chat-msg-sender" style="font-size:11px;color:var(--gray);margin-bottom:2px;">${m.name}${m.isAdmin?' <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" width="14" height="14" style="vertical-align:middle;"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>':''}</div>`:''}
    <div class="chat-msg-bubble">${m.text}</div>
    <div style="font-size:10px;color:var(--gray);margin-top:2px;text-align:${isMe?'right':'left'};">${time}</div>
  </div>`;
}

// (sendStaffMsg fully implemented below with file/media upload support — duplicate removed)

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
      await db.collection(chatCollection).doc(chatId).update({lastMessage:mediaUrl?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> ${mediaType==='image'?'Image':mediaType==='audio'?'Voice note':'Video'}`:text});
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
function chatMsgWithMediaHTML(m, currentUid, collection='chats', docId=''){
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
  const reactHTML=m.reactions?msgReactionsHTML(m.reactions):'';
  const seenHTML=isMe&&m.seenBy?seenReceiptHTML(m.seenBy,0):'';
  return`<div class="chat-msg ${isMe?'me':'other'}" style="margin-bottom:8px;" id="msg-${m.id||''}">
    ${!isMe?`<div class="chat-msg-sender">${m.name}</div>`:''}
    <div class="chat-msg-bubble">
      ${m.text?`<div>${m.text}</div>`:''}
      ${mediaHTML}
      <div style="font-size:10px;opacity:0.6;margin-top:3px;text-align:right;">${time}</div>
    </div>
    ${reactHTML}
    ${seenHTML}
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
    preview.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><div style="font-size:24px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></div><div style="flex:1;font-size:12px;color:var(--gray);">${file.name}</div><button onclick="clearFilePreview('${previewId}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button></div>`;
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
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:15px;font-weight:600;color:var(--white);">${chat.name}</div>
      <div id="chat-call-btn"></div>
    </div>
    <div class="chat-messages" id="chat-messages" style="flex:1;overflow-y:auto;padding:14px;"></div>
    ${chatInputBarHTML(`sendGroupChatMsg('${id}','${previewId}')`, 'chat-input', previewId)}
  `;
  if(window._chatMsgUnsub){window._chatMsgUnsub();}
  listenChatCall(id, chat.name);
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
// (listenClubChat fully implemented further below with role badges added on top of media support)

// ============================================================
// BATCH 2 — PROFILE PICS, ACCENT COLORS, FRIENDS, ELECTIONS+
// ============================================================

// ---- PROFILE PICTURE UPLOAD ----
window.uploadProfilePicture = async function uploadProfilePicture(){
  const input=document.getElementById('profile-pic-input');
  if(!input||!input.files[0])return alert('Please select a photo first.');
  const file=input.files[0];
  if(file.size>5*1024*1024)return alert('Photo must be under 5MB.');
  const btn=document.getElementById('upload-pic-btn');
  if(btn){btn.textContent='Uploading...';btn.disabled=true;}
  try{
    const result=await uploadToCloudinary(file,'image');
    const photoURL=result.url;
    // Save to Firestore
    await db.collection('users').doc(currentUser.uid).update({photoURL});
    currentUserData.photoURL=photoURL;
    // Update all avatar displays
    updateAllAvatars(photoURL);
    alert('Profile picture updated!');
    if(btn){btn.textContent='Upload Photo';btn.disabled=false;}
  }catch(e){
    alert('Upload failed: '+e.message);
    if(btn){btn.textContent='Upload Photo';btn.disabled=false;}
  }
}

window.updateAllAvatars = function updateAllAvatars(photoURL){
  // Update sidebar avatar
  const sidebarAv=document.getElementById('sidebar-avatar');
  if(sidebarAv){
    if(photoURL){
      sidebarAv.style.backgroundImage=`url(${photoURL})`;
      sidebarAv.style.backgroundSize='cover';
      sidebarAv.style.backgroundPosition='center';
      sidebarAv.textContent='';
    }
  }
  // Update profile big avatar
  const profileAv=document.getElementById('profile-avatar-big');
  if(profileAv){
    if(photoURL){
      profileAv.style.backgroundImage=`url(${photoURL})`;
      profileAv.style.backgroundSize='cover';
      profileAv.style.backgroundPosition='center';
      profileAv.textContent='';
    }
  }
  // Update ID card avatar
  const idAv=document.getElementById('id-avatar');
  if(idAv&&photoURL){
    idAv.style.backgroundImage=`url(${photoURL})`;
    idAv.style.backgroundSize='cover';
    idAv.style.backgroundPosition='center';
    idAv.textContent='';
  }
}

window.avatarHTML = function avatarHTML(user, size=36){
  const s=`width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.4)}px;font-weight:700;color:white;overflow:hidden;`;
  if(user.photoURL){
    return`<div style="${s}background:${user.avatar||'#1a56db'};"><img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>`;
  }
  return`<div style="${s}background:${user.avatar||'#1a56db'};">${user.name?user.name[0].toUpperCase():''}</div>`;
}

// ---- CUSTOM ACCENT COLORS ----
const ACCENT_COLORS={
  blue:{name:'Blue',primary:'#1a56db',light:'#3b82f6',css:'26,86,219'},
  purple:{name:'Purple',primary:'#7c3aed',light:'#8b5cf6',css:'124,58,237'},
  green:{name:'Green',primary:'#059669',light:'#10b981',css:'5,150,105'},
  red:{name:'Red',primary:'#dc2626',light:'#ef4444',css:'220,38,38'},
  gold:{name:'Gold',primary:'#d97706',light:'#f59e0b',css:'217,119,6'},
  pink:{name:'Pink',primary:'#db2777',light:'#ec4899',css:'219,39,119'},
  orange:{name:'Orange',primary:'#ea580c',light:'#f97316',css:'234,88,12'},
  teal:{name:'Teal',primary:'#0891b2',light:'#06b6d4',css:'8,145,178'},
};

window.applyAccentColor = function applyAccentColor(colorKey){
  const color=ACCENT_COLORS[colorKey];
  if(!color)return;
  const root=document.documentElement;
  root.style.setProperty('--blue','#'+color.primary.slice(1));
  root.style.setProperty('--blue-light',color.light);
  root.style.setProperty('--accent-primary',color.primary);
  root.style.setProperty('--accent-light',color.light);
  // Update CSS variables used throughout
  const style=document.getElementById('accent-style')||document.createElement('style');
  style.id='accent-style';
  style.textContent=`
    .btn-blue, .btn-primary { background: ${color.primary} !important; }
    .nav-item.active { color: ${color.light} !important; }
    .nav-item.active svg { stroke: ${color.light} !important; }
    .tab-btn.active { color: ${color.light} !important; border-bottom-color: ${color.light} !important; }
    .grade-circle-big { background: ${color.primary} !important; }
    a { color: ${color.light} !important; }
    input:focus, select:focus, textarea:focus { border-color: ${color.primary} !important; }
    .chat-send { background: ${color.primary} !important; }
    .poll-fill { background: ${color.primary} !important; }
    .wlt-win { background: rgba(${color.css},.15) !important; color: ${color.light} !important; }
  `;
  document.head.appendChild(style);
}

window.setAccentColor = async function setAccentColor(colorKey){
  applyAccentColor(colorKey);
  await db.collection('users').doc(currentUser.uid).update({accentColor:colorKey});
  currentUserData.accentColor=colorKey;
  // Update selected state in UI
  document.querySelectorAll('.accent-swatch').forEach(s=>s.classList.remove('selected'));
  const el=document.querySelector(`[data-color="${colorKey}"]`);
  if(el)el.classList.add('selected');
}

window.renderAccentPicker = function renderAccentPicker(){
  const el=document.getElementById('accent-picker');if(!el)return;
  el.innerHTML=Object.entries(ACCENT_COLORS).map(([key,c])=>`
    <div class="accent-swatch ${currentUserData.accentColor===key?'selected':''}" 
      data-color="${key}"
      onclick="setAccentColor('${key}')"
      style="width:36px;height:36px;border-radius:50%;background:${c.primary};cursor:pointer;border:3px solid ${currentUserData.accentColor===key?'white':'transparent'};transition:all .2s;"
      title="${c.name}"></div>
  `).join('');
}

// ---- FRIEND/FOLLOW SYSTEM ----
window.followUser = async function followUser(uid){
  if(uid===currentUser.uid)return;
  await db.collection('follows').doc(currentUser.uid).collection('following').doc(uid).set({
    uid,followedAt:FS.serverTimestamp()
  });
  await db.collection('follows').doc(uid).collection('followers').doc(currentUser.uid).set({
    uid:currentUser.uid,followedAt:FS.serverTimestamp()
  });
}

window.unfollowUser = async function unfollowUser(uid){
  await db.collection('follows').doc(currentUser.uid).collection('following').doc(uid).delete();
  await db.collection('follows').doc(uid).collection('followers').doc(currentUser.uid).delete();
}

async function isFollowing(uid){
  const snap=await db.collection('follows').doc(currentUser.uid).collection('following').doc(uid).get();
  return snap.exists;
}

async function renderDirectory(){
  const snap=await db.collection('users').where('school','==',currentUserData.school).get();
  const users=snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser.uid);
  // Get following list
  const followingSnap=await db.collection('follows').doc(currentUser.uid).collection('following').get();
  const followingIds=new Set(followingSnap.docs.map(d=>d.id));
  displayDir(users,followingIds);
}

function displayDir(users,followingIds=new Set()){
  const roleFilter=document.getElementById('dir-role-filter')?.value||'';
  if(roleFilter){
    users=users.filter(u=>{
      if(roleFilter==='admin')return u.isAdmin;
      if(roleFilter==='teacher')return u.isTeacher&&!u.isAdmin;
      if(roleFilter==='student')return !u.isTeacher&&!u.isAdmin;
      return true;
    });
  }
  document.getElementById('dir-list').innerHTML=users.length?users.map(u=>{
    const isFollowing=followingIds.has(u.uid);
    return`<div class="dir-item">
      ${avatarHTML(u,40)}
      <div style="flex:1;margin-left:10px;">
        <div class="dir-name">${u.name}</div>
        <div class="dir-school">${u.email}</div>
      </div>
      <span class="role-badge ${u.isAdmin?'role-admin':u.isTeacher?'role-teacher':'role-student'}">${u.isAdmin?'Admin':u.isTeacher?'Teacher':'Student'}</span>
      <button onclick="${isFollowing?`unfollowUserDir('${u.uid}',this)`:`followUserDir('${u.uid}',this)`}" 
        style="margin-left:8px;padding:4px 12px;border-radius:8px;border:1px solid ${isFollowing?'var(--border)':'#3b82f6'};background:${isFollowing?'transparent':'rgba(59,130,246,.15)'};color:${isFollowing?'var(--gray)':'#3b82f6'};font-size:12px;cursor:pointer;font-weight:600;">
        ${isFollowing?'Following':'Follow'}
      </button>
      ${currentUserData.isAdmin?`<button class="btn-red btn-sm" style="margin-left:6px;" onclick="removeFromSchool('${u.uid}','${u.name.replace(/'/g,"\\'")}')">Remove from School</button>`:''}
    </div>`;
  }).join(''):'<div class="empty-state">No students found</div>';
}

async function removeFromSchool(uid,name){
  if(!currentUserData.isAdmin)return;
  if(!confirm(`Remove ${name} from this school? They will be logged out and can sign up again with the same email if needed. This is meant for cleaning up test or duplicate accounts.`))return;
  try{
    await db.collection('users').doc(uid).delete();
    alert(`${name} has been removed from the school.`);
    filterDir();
  }catch(e){alert('Error removing user: '+e.message);}
}
window.removeFromSchool=removeFromSchool;

window.followUserDir = async function followUserDir(uid,btn){
  await followUser(uid);
  btn.textContent='Following';
  btn.style.background='transparent';
  btn.style.color='var(--gray)';
  btn.style.borderColor='var(--border)';
  btn.onclick=()=>unfollowUserDir(uid,btn);
}

window.unfollowUserDir = async function unfollowUserDir(uid,btn){
  await unfollowUser(uid);
  btn.textContent='Follow';
  btn.style.background='rgba(59,130,246,.15)';
  btn.style.color='#3b82f6';
  btn.style.borderColor='#3b82f6';
  btn.onclick=()=>followUserDir(uid,btn);
}

async function filterDir(){
  const q=document.getElementById('dir-search').value.toLowerCase();
  const snap=await db.collection('users').where('school','==',currentUserData.school).get();
  const users=snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser.uid&&u.name.toLowerCase().includes(q));
  const followingSnap=await db.collection('follows').doc(currentUser.uid).collection('following').get();
  const followingIds=new Set(followingSnap.docs.map(d=>d.id));
  displayDir(users,followingIds);
}

window.renderFollowingTab = async function renderFollowingTab(){
  const el=document.getElementById('following-list');if(!el)return;
  const snap=await db.collection('follows').doc(currentUser.uid).collection('following').get();
  if(snap.empty){el.innerHTML='<div class="empty-state">Not following anyone yet</div>';return;}
  const uids=snap.docs.map(d=>d.id);
  const userSnaps=await Promise.all(uids.map(uid=>db.collection('users').doc(uid).get()));
  el.innerHTML=userSnaps.filter(s=>s.exists).map(s=>{
    const u=s.data();
    return`<div class="dir-item">
      ${avatarHTML(u,40)}
      <div style="flex:1;margin-left:10px;">
        <div class="dir-name">${u.name}</div>
        <div class="dir-school">${u.email}</div>
      </div>
      <button onclick="unfollowUserDir('${u.uid}',this)" style="padding:4px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--gray);font-size:12px;cursor:pointer;">Following</button>
    </div>`;
  }).join('');
}

window.renderFollowersTab = async function renderFollowersTab(){
  const el=document.getElementById('followers-list');if(!el)return;
  const snap=await db.collection('follows').doc(currentUser.uid).collection('followers').get();
  if(snap.empty){el.innerHTML='<div class="empty-state">No followers yet</div>';return;}
  const uids=snap.docs.map(d=>d.id);
  const userSnaps=await Promise.all(uids.map(uid=>db.collection('users').doc(uid).get()));
  el.innerHTML=userSnaps.filter(s=>s.exists).map(s=>{
    const u=s.data();
    return`<div class="dir-item">
      ${avatarHTML(u,40)}
      <div style="flex:1;margin-left:10px;">
        <div class="dir-name">${u.name}</div>
        <div class="dir-school">${u.email}</div>
      </div>
    </div>`;
  }).join('');
}

window.switchDirTab = function switchDirTab(tab,el){
  document.querySelectorAll('#page-directory .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('dir-all-tab').style.display=tab==='all'?'':'none';
  document.getElementById('dir-following-tab').style.display=tab==='following'?'':'none';
  document.getElementById('dir-followers-tab').style.display=tab==='followers'?'':'none';
  if(tab==='following')renderFollowingTab();
  if(tab==='followers')renderFollowersTab();
}

// ---- ACTIVITY FEED ----
window.renderActivityFeed = async function renderActivityFeed(){
  const el=document.getElementById('activity-feed');if(!el)return;
  const followingSnap=await db.collection('follows').doc(currentUser.uid).collection('following').get();
  if(followingSnap.empty){el.innerHTML='<div class="empty-state">Follow people to see their activity here!</div>';return;}
  const followingIds=followingSnap.docs.map(d=>d.id);
  // Get recent announcements from people you follow
  const activities=[];
  const annSnap=await db.collection('announcements').where('school','==',currentUserData.school).get();
  annSnap.docs.forEach(d=>{
    const data=d.data();
    if(followingIds.includes(data.postedBy)){
      activities.push({type:'announcement',name:data.postedByName,text:data.title,time:data.createdAt?.toMillis?data.createdAt.toMillis():0});
    }
  });
  activities.sort((a,b)=>b.time-a.time);
  el.innerHTML=activities.length?activities.slice(0,10).map(a=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;"></div>
      <div style="flex:1;font-size:13px;color:var(--gray-light);">
        <strong style="color:var(--white);">${a.name}</strong> posted an announcement: ${a.text}
      </div>
    </div>`).join(''):'<div class="empty-state">No recent activity from people you follow</div>';
}

// ---- ELECTIONS UPGRADES ----
async function addCandidateToExistingElection(electionId,positionId){
  const name=prompt('Candidate name:');if(!name)return;
  const bio=prompt('Campaign bio/speech (optional):');
  const snap=await db.collection('elections').doc(electionId).get();
  if(!snap.exists)return;
  const data=snap.data();
  const positions=data.positions||[];
  const pos=positions.find(p=>p.id===positionId);
  if(!pos)return;
  pos.candidates=[...(pos.candidates||[]),{id:genId(),name,bio:bio||'',photoUrl:null}];
  await db.collection('elections').doc(electionId).update({positions});
  alert('Candidate added! Note: to add a photo for this candidate, delete and recreate the election with the photo upload in the creation form, or contact support for a photo update.');
}

// Expose all new globals
window.uploadProfilePicture=uploadProfilePicture;
window.avatarHTML=avatarHTML;
window.updateAllAvatars=updateAllAvatars;
window.setAccentColor=setAccentColor;
window.applyAccentColor=applyAccentColor;
window.renderAccentPicker=renderAccentPicker;
window.followUser=followUser;
window.unfollowUser=unfollowUser;
window.followUserDir=followUserDir;
window.unfollowUserDir=unfollowUserDir;
window.renderDirectory=renderDirectory;
window.filterDir=filterDir;
window.renderFollowingTab=renderFollowingTab;
window.renderFollowersTab=renderFollowersTab;
window.switchDirTab=switchDirTab;
window.renderActivityFeed=renderActivityFeed;
window.addCandidateToExistingElection=addCandidateToExistingElection;


// ---- WINDOW GLOBALS ----
if(typeof ls!=="undefined")window.ls=ls;
if(typeof lsArr!=="undefined")window.lsArr=lsArr;
if(typeof genId!=="undefined")window.genId=genId;
if(typeof genPassId!=="undefined")window.genPassId=genPassId;
if(typeof pad!=="undefined")window.pad=pad;
if(typeof daysDiff!=="undefined")window.daysDiff=daysDiff;
if(typeof localDateStr!=="undefined")window.localDateStr=localDateStr;
if(typeof switchAuth!=="undefined")window.switchAuth=switchAuth;
if(typeof showAuthError!=="undefined")window.showAuthError=showAuthError;
if(typeof signIn!=="undefined")window.signIn=signIn;
if(typeof signUp!=="undefined")window.signUp=signUp;
if(typeof signOut!=="undefined")window.signOut=signOut;
if(typeof showForgot!=="undefined")window.showForgot=showForgot;
if(typeof uploadProfilePicture!=="undefined")window.uploadProfilePicture=uploadProfilePicture;
if(typeof setAccentColor!=="undefined")window.setAccentColor=setAccentColor;
if(typeof applyAccentColor!=="undefined")window.applyAccentColor=applyAccentColor;
if(typeof renderAccentPicker!=="undefined")window.renderAccentPicker=renderAccentPicker;
if(typeof followUserDir!=="undefined")window.followUserDir=followUserDir;
if(typeof unfollowUserDir!=="undefined")window.unfollowUserDir=unfollowUserDir;
if(typeof switchDirTab!=="undefined")window.switchDirTab=switchDirTab;
if(typeof renderFollowingTab!=="undefined")window.renderFollowingTab=renderFollowingTab;
if(typeof renderFollowersTab!=="undefined")window.renderFollowersTab=renderFollowersTab;
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
// (saveNote/renderNotesList/loadNote/loadNoteItem removed in Class Notes block-deck restructure)
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

// ============================================================
// BATCH 1 NEW FEATURES
// ============================================================

// ---- REACTIONS ON ANNOUNCEMENTS ----
async function reactToAnnouncement(annId, key){
  const ref=db.collection('announcements').doc(annId);
  const snap=await ref.get();
  if(!snap.exists)return;
  const reactions=snap.data().reactions||{};
  const myReactions=reactions[currentUser.uid]||{};
  if(myReactions[key]){
    // Remove reaction
    const updated={...myReactions};
    delete updated[key];
    await ref.update({[`reactions.${currentUser.uid}`]:updated});
  }else{
    await ref.update({[`reactions.${currentUser.uid}`]:{...myReactions,[key]:true}});
  }
}

// Reaction keys — simple short strings, displayed as text
const REACTION_EMOJIS=[
  {key:'like', label:'👍', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>'},
  {key:'love', label:'❤️', svg:'<svg viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'},
  {key:'haha', label:'😂', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 3 4 3 4-3 4-3"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'},
  {key:'fire', label:'🔥', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="16" height="16"><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/></svg>'},
  {key:'clap', label:'👏', svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'},
];

function getReactionCounts(reactions){
  const counts={};
  REACTION_EMOJIS.forEach(e=>{counts[e.key]=0;});
  Object.values(reactions||{}).forEach(userReactions=>{
    Object.keys(userReactions||{}).forEach(k=>{if(userReactions[k]&&counts[k]!==undefined)counts[k]++;});
  });
  return counts;
}

function reactionsHTML(annId, reactions){
  const counts=getReactionCounts(reactions);
  const myReactions=(reactions||{})[currentUser.uid]||{};
  return`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
    ${REACTION_EMOJIS.map(e=>{
      const active=myReactions[e.key];
      const count=counts[e.key];
      return`<button onclick="reactToAnnouncement('${annId}','${e.key}')" style="background:${active?'rgba(59,130,246,.2)':'rgba(255,255,255,.05)'};border:1px solid ${active?'#3b82f6':'var(--border)'};border-radius:20px;padding:3px 10px;cursor:pointer;font-size:13px;color:var(--white);display:flex;align-items:center;gap:4px;">${e.svg}${count>0?`<span style="font-size:11px;">${count}</span>`:''}</button>`;
    }).join('')}
  </div>`;
}

// ---- SEARCH ----
function openSearch(){
  const existing=document.getElementById('search-overlay');
  if(existing){existing.style.display='flex';document.getElementById('search-input').focus();return;}
  const overlay=document.createElement('div');
  overlay.id='search-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:600;display:flex;flex-direction:column;align-items:center;padding-top:80px;';
  overlay.innerHTML=`
    <div style="width:90%;max-width:600px;">
      <div style="display:flex;gap:10px;margin-bottom:16px;">
        <input id="search-input" class="input" placeholder="Search announcements, directory, chats..." style="flex:1;font-size:16px;" oninput="runSearch(this.value)">
        <button class="btn-ghost" onclick="closeSearch()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div id="search-results" style="background:var(--surface);border-radius:12px;overflow:hidden;max-height:60vh;overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('search-input')?.focus(),100);
}

function closeSearch(){
  const el=document.getElementById('search-overlay');
  if(el)el.style.display='none';
}

async function runSearch(q){
  const el=document.getElementById('search-results');
  if(!q||q.length<2){el.innerHTML='';return;}
  el.innerHTML='<div class="empty-state" style="padding:20px;">Searching...</div>';
  const results=[];
  // Search announcements
  const annSnap=await db.collection('announcements').where('school','==',currentUserData.school).get();
  annSnap.docs.forEach(d=>{
    const data=d.data();
    if(data.title?.toLowerCase().includes(q.toLowerCase())||data.body?.toLowerCase().includes(q.toLowerCase())){
      results.push({type:'announcement',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>',title:data.title,sub:data.body?.slice(0,60),action:`nav('announcements')`});
    }
  });
  // Search directory
  const dirSnap=await db.collection('users').where('school','==',currentUserData.school).get();
  dirSnap.docs.forEach(d=>{
    const data=d.data();
    if(data.name?.toLowerCase().includes(q.toLowerCase())||data.email?.toLowerCase().includes(q.toLowerCase())){
      results.push({type:'user',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',title:data.name,sub:data.email+' • '+data.role,action:`nav('directory')`});
    }
  });
  // Search chats
  const chatSnap=await db.collection('chats').where('school','==',currentUserData.school).where('memberEmails','array-contains',currentUserData.email).get();
  chatSnap.docs.forEach(d=>{
    const data=d.data();
    if(data.name?.toLowerCase().includes(q.toLowerCase())){
      results.push({type:'chat',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',title:data.name,sub:'Group chat',action:`openChat('${d.id}');nav('chat');closeSearch()`});
    }
  });
  el.innerHTML=results.length?results.map(r=>`
    <div onclick="${r.action};closeSearch()" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background=''">
      <span style="font-size:20px;">${r.icon}</span>
      <div><div style="font-size:14px;font-weight:600;color:var(--white);">${r.title}</div><div style="font-size:12px;color:var(--gray);">${r.sub||''}</div></div>
    </div>`).join(''):'<div class="empty-state" style="padding:20px;">No results for "'+q+'"</div>';
}

// ---- ANONYMOUS TIP LINE ----
function renderTipLine(){
  const el=document.getElementById('tip-list');
  if(!el)return;
  if(!currentUserData.isAdmin&&!currentUserData.isTeacher){
    document.getElementById('tip-submit-section').style.display='';
    document.getElementById('tip-admin-section').style.display='none';
  }else{
    document.getElementById('tip-submit-section').style.display='none';
    document.getElementById('tip-admin-section').style.display='';
    const unsub=db.collection('tips').where('school','==',currentUserData.school).onSnapshot(snap=>{
      const tips=snap.docs.map(d=>({id:d.id,...d.data()}));
      // Sort: unresolved urgent first, then unresolved by date, then resolved
      tips.sort((a,b)=>{
        if(a.resolved!==b.resolved)return a.resolved?1:-1;
        if(a.urgent!==b.urgent)return a.urgent?-1:1;
        return (b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0);
      });
      checkTipEscalation(tips);
      el.innerHTML=tips.length?tips.map(t=>`
        <div style="background:var(--card2);border:1px solid ${t.urgent&&!t.resolved?'#ef4444':'var(--border)'};border-radius:10px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            ${t.urgent?'<span style="background:rgba(239,68,68,.2);color:#ef4444;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">URGENT</span>':''}
            <span style="background:rgba(239,68,68,.15);color:#ef4444;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">${t.category||'General'}</span>
            <span style="font-size:11px;color:var(--gray);">${t.createdAt?.toDate?t.createdAt.toDate().toLocaleDateString():'Just now'}</span>
            <span style="font-size:11px;color:var(--gray);">• Anonymous</span>
            ${t.trackingCode?`<span style="font-size:10px;color:var(--gray);font-family:monospace;">#${t.trackingCode}</span>`:''}
          </div>
          <div style="font-size:14px;color:var(--white);">${t.message}</div>
          ${t.resolved?'<div style="font-size:11px;color:#22c55e;margin-top:8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg> Resolved</div>':`<button class="btn-ghost btn-sm" style="margin-top:8px;" onclick="resolveTip('${t.id}')">Mark Resolved</button>`}
        </div>`).join(''):'<div class="empty-state">No tips yet</div>';
    });
    unsubscribers.push(unsub);
  }
}

function checkTipEscalation(tips){
  // Auto-escalation reminder: urgent tips unresolved for more than 2 hours
  const urgentStale=tips.filter(t=>t.urgent&&!t.resolved&&t.createdAt?.toMillis&&(Date.now()-t.createdAt.toMillis())>2*3600000);
  if(urgentStale.length&&!ls('ss_tip_escalation_shown_'+localDateStr())){
    sendPushNotif('Urgent Tip Needs Attention',`${urgentStale.length} urgent tip(s) have been unresolved for over 2 hours.`);
    ls('ss_tip_escalation_shown_'+localDateStr(),true);
  }
}

function genTrackingCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  for(let i=0;i<8;i++)code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}

async function submitTip(){
  const msg=document.getElementById('tip-message').value.trim();
  const cat=document.getElementById('tip-category').value;
  const urgent=document.getElementById('tip-urgent')?.checked||false;
  if(!msg)return alert('Please describe the issue.');
  const trackingCode=genTrackingCode();
  await db.collection('tips').add({message:msg,category:cat,urgent,trackingCode,school:currentUserData.school,resolved:false,createdAt:FS.serverTimestamp()});
  document.getElementById('tip-message').value='';
  if(document.getElementById('tip-urgent'))document.getElementById('tip-urgent').checked=false;
  alert(`Tip submitted anonymously. Thank you for helping keep our school safe!\n\nYour tracking code: ${trackingCode}\nSave this code to check your tip's status later.`);
}

async function checkTipStatus(){
  const code=document.getElementById('tip-tracking-input').value.trim().toUpperCase();
  const resultEl=document.getElementById('tip-tracking-result');
  if(!code){resultEl.innerHTML='';return;}
  const snap=await db.collection('tips').where('trackingCode','==',code).get();
  if(snap.empty){resultEl.innerHTML='<div style="color:#ef4444;font-size:13px;">Tracking code not found.</div>';return;}
  const tip=snap.docs[0].data();
  resultEl.innerHTML=`<div style="color:${tip.resolved?'#22c55e':'#f59e0b'};font-size:13px;font-weight:600;">${tip.resolved?'✓ Resolved':'⏳ Still being reviewed'}</div>`;
}
window.checkTipStatus=checkTipStatus;

async function resolveTip(id){await db.collection('tips').doc(id).update({resolved:true});}

// ---- EMERGENCY ALERT ----
async function sendEmergencyAlert(){
  if(!currentUserData.isAdmin)return;
  const msg=document.getElementById('emergency-msg').value.trim();
  if(!msg)return alert('Enter an alert message.');
  if(!confirm(`Send EMERGENCY ALERT to ALL students and staff at ${currentUserData.school}?\n\n"${msg}"`))return;
  await db.collection('announcements').add({
    title:'<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> EMERGENCY ALERT',body:msg,
    postedBy:currentUser.uid,postedByName:currentUserData.name,
    school:currentUserData.school,isEmergency:true,
    createdAt:FS.serverTimestamp()
  });
  document.getElementById('emergency-msg').value='';
  alert('Emergency alert sent to everyone!');
  closeAllModals();
}

// ---- ATTENDANCE TRACKER ----
async function renderAttendance(){
  if(!currentClass)return;
  const el=document.getElementById('attendance-list');if(!el)return;
  const today=localDateStr();
  const students=currentClass.students||[];
  if(!students.length){el.innerHTML='<div class="empty-state">No students in this class</div>';return;}
  const snap=await db.collection('attendance').doc(`${currentClass.id}_${today}`).get();
  const existing=snap.exists?snap.data():{};
  const userSnaps=await Promise.all(students.map(uid=>db.collection('users').doc(uid).get()));
  el.innerHTML=`<div style="font-size:13px;color:var(--gray);margin-bottom:12px;">Attendance for ${today}</div>`+
    userSnaps.filter(s=>s.exists).map(s=>{
      const u=s.data();
      const status=existing[u.uid]||'present';
      return`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="dir-avatar" style="background:${u.avatar};width:32px;height:32px;font-size:13px;">${u.name[0]}</div>
        <div style="flex:1;font-size:14px;color:var(--white);">${u.name}</div>
        <div style="display:flex;gap:6px;">
          ${['present','absent','tardy','excused'].map(s2=>`<button onclick="markAttendance('${u.uid}','${s2}','${today}')" style="padding:4px 10px;border-radius:6px;border:1px solid ${status===s2?'#3b82f6':'var(--border)'};background:${status===s2?'rgba(59,130,246,.2)':'transparent'};color:${status===s2?'#3b82f6':'var(--gray)'};font-size:11px;cursor:pointer;font-weight:${status===s2?'700':'400'};">${s2}</button>`).join('')}
        </div>
      </div>`;
    }).join('');
}

async function markAttendance(uid,status,date){
  if(!currentClass)return;
  // Save to attendance collection
  await db.collection('attendance').doc(`${currentClass.id}_${date}`).set({[uid]:status},{merge:true});
  // Auto-log to student's absence record in Firestore
  if(status==='absent'||status==='tardy'||status==='excused'){
    const absType=status==='absent'?'Unexcused':status==='tardy'?'Tardy':'Parent Excused';
    // Check if already logged for this class+date
    const existing=await db.collection('studentAbsences')
      .where('uid','==',uid).where('date','==',date).where('classId','==',currentClass.id).get();
    if(existing.empty){
      await db.collection('studentAbsences').add({
        uid,date,type:absType,
        cls:currentClass.name,
        classId:currentClass.id,
        school:currentUserData.school,
        markedBy:currentUserData.name,
        createdAt:FS.serverTimestamp()
      });
    }else{
      await existing.docs[0].ref.update({type:absType});
    }
  }else if(status==='present'){
    // Remove absence if marked present
    const existing=await db.collection('studentAbsences')
      .where('uid','==',uid).where('date','==',date).where('classId','==',currentClass.id).get();
    await Promise.all(existing.docs.map(d=>d.ref.delete()));
  }
  renderAttendance();
}

// ---- GRADE ENTRY FOR TEACHERS ----
async function renderGradeEntry(){
  if(!currentClass)return;
  const el=document.getElementById('grade-entry-list');if(!el)return;
  const assignments=currentClass.assignments||[];
  const students=currentClass.students||[];
  if(!assignments.length){el.innerHTML='<div class="empty-state">No assignments yet</div>';return;}
  if(!students.length){el.innerHTML='<div class="empty-state">No students yet</div>';return;}
  const userSnaps=await Promise.all(students.map(uid=>db.collection('users').doc(uid).get()));
  const users=userSnaps.filter(s=>s.exists).map(s=>s.data());
  const grades=currentClass.grades||{};
  el.innerHTML=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="border-bottom:2px solid var(--border);">
      <th style="text-align:left;padding:8px;color:var(--gray);">Student</th>
      ${assignments.map(a=>`<th style="padding:8px;color:var(--gray);text-align:center;min-width:80px;">${a.name}<br><span style="font-size:10px;font-weight:400;">${a.weight}%</span></th>`).join('')}
      <th style="padding:8px;color:var(--gray);text-align:center;">Avg</th>
    </tr>
    ${users.map(u=>{
      const avg=assignments.reduce((s,a)=>{const g=(grades[a.id]||{})[u.uid];return g!==undefined?s+g*(a.weight/100):s;},0)/Math.max(1,assignments.reduce((s,a)=>{const g=(grades[a.id]||{})[u.uid];return g!==undefined?s+a.weight/100:s;},0))||0;
      return`<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px;color:var(--white);">${u.name}</td>
        ${assignments.map(a=>`<td style="padding:4px;text-align:center;"><input type="number" min="0" max="100" value="${(grades[a.id]||{})[u.uid]??''}" placeholder="—" onchange="saveGrade('${a.id}','${u.uid}',this.value)" style="width:60px;background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:4px;color:var(--white);text-align:center;font-size:13px;"></td>`).join('')}
        <td style="padding:8px;text-align:center;font-weight:700;color:${avg>=90?'#22c55e':avg>=70?'#3b82f6':'#ef4444'};">${avg?Math.round(avg)+'%':'—'}</td>
      </tr>`;
    }).join('')}
  </table></div>`;
}

async function saveGrade(assignmentId,studentUid,value){
  if(!currentClass)return;
  const grade=value===''?null:Math.min(100,Math.max(0,parseInt(value)));
  await db.collection('classrooms').doc(currentClass.id).update({[`grades.${assignmentId}.${studentUid}`]:grade});
  const snap=await db.collection('classrooms').doc(currentClass.id).get();
  if(snap.exists)currentClass={...currentClass,...snap.data()};
}

// ---- LEADERBOARD ----
async function renderLeaderboard(){
  const el=document.getElementById('leaderboard-list');if(!el)return;
  el.innerHTML='<div class="empty-state">Loading...</div>';
  const snap=await db.collection('users').where('school','==',currentUserData.school).get();
  const users=snap.docs.map(d=>d.data()).filter(u=>u.role==='student');
  // Calculate scores based on on-time passes
  const passSnap=await db.collection('hallpasses').where('school','==',currentUserData.school).where('status','==','completed').get();
  const scores={};
  passSnap.docs.forEach(d=>{
    const data=d.data();
    if(!scores[data.studentUid])scores[data.studentUid]={passes:0,onTime:0};
    scores[data.studentUid].passes++;
    if(!data.overdue)scores[data.studentUid].onTime++;
  });
  const ranked=users.map(u=>({...u,score:scores[u.uid]?.onTime||0,passes:scores[u.uid]?.passes||0})).sort((a,b)=>b.score-a.score).slice(0,20);
  el.innerHTML=ranked.length?ranked.map((u,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:${i<3?'24':'16'}px;font-weight:700;color:${i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3a':'var(--gray)'};width:32px;text-align:center;">${i===0?'<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="22" height="22" style="vertical-align:middle;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>':i===1?'<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" width="22" height="22" style="vertical-align:middle;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>':i===2?'<svg viewBox="0 0 24 24" fill="none" stroke="#cd7c3a" stroke-width="2" width="22" height="22" style="vertical-align:middle;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>':i+1}</div>
      <div class="dir-avatar" style="background:${u.avatar};width:36px;height:36px;">${u.name[0]}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--white);">${u.name}</div><div style="font-size:11px;color:var(--gray);">${u.passes} passes • ${u.score} on time</div></div>
      <div style="font-size:18px;font-weight:700;color:#22c55e;">${u.score} pts</div>
    </div>`).join(''):'<div class="empty-state">No data yet</div>';
}

// ---- SCHOOL NEWSPAPER ----
function renderNewspaper(){
  loadYoutubeVideos();
  const unsub=db.collection('newspaper').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const articles=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    const el=document.getElementById('newspaper-list');if(!el)return;
    el.innerHTML=articles.length?articles.map(a=>`
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:10px;color:var(--blue-light);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${a.category||'News'}</div>
        <div style="font-size:20px;font-weight:700;color:var(--white);margin-bottom:8px;">${a.title}</div>
        <div style="font-size:13px;color:var(--gray);margin-bottom:12px;">By ${a.authorName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Just now'}</div>
        <div style="font-size:14px;color:var(--gray-light);line-height:1.6;">${a.body}</div>
        ${currentUserData.isAdmin?`<button class="btn-ghost btn-sm" style="margin-top:12px;" onclick="deleteArticle('${a.id}')">Delete</button>`:''}
      </div>`).join(''):'<div class="empty-state">No articles yet</div>';
  });
  unsubscribers.push(unsub);
}

async function getNewspaperChannelId(){
  if(currentUserData.school==='Carolina Forest High School'){
    return 'UCA5hSHjHTG4-WXe9uxXFZ2g'; // Panther Podcast — hardcoded for Carolina Forest
  }
  if(cachedSchoolSettings?.youtubeChannelId)return cachedSchoolSettings.youtubeChannelId;
  // Fallback: load fresh if cache isn't ready yet
  const snap=await db.collection('schoolSettings').doc(currentUserData.school).get();
  return snap.exists?snap.data().youtubeChannelId:null;
}

async function loadYoutubeVideos(){
  const el=document.getElementById('newspaper-videos');
  if(!el)return;
  const channelId=await getNewspaperChannelId();
  if(!channelId){
    el.innerHTML='<div class="empty-state">No YouTube channel connected for this school yet. An admin can set this up in School Setup.</div>';
    return;
  }
  el.innerHTML='<div class="empty-state">Loading videos...</div>';
  try{
    const rssUrl=`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    // Use rss2json as a CORS-friendly proxy since browsers can't fetch YouTube RSS directly
    const res=await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
    const data=await res.json();
    if(data.status!=='ok'||!data.items?.length){
      el.innerHTML='<div class="empty-state">No videos found for this channel yet.</div>';
      return;
    }
    const videos=data.items.slice(0,6);
    el.innerHTML=videos.map(v=>{
      const videoIdMatch=v.link.match(/v=([^&]+)/);
      const videoId=videoIdMatch?videoIdMatch[1]:null;
      if(!videoId)return '';
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:8px;">${v.title}</div>
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;">
          <iframe src="https://www.youtube-nocookie.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
        </div>
        <div style="font-size:12px;color:var(--gray);margin-top:8px;">${new Date(v.pubDate).toLocaleDateString()}</div>
      </div>`;
    }).join('');
  }catch(e){
    el.innerHTML='<div class="empty-state">Could not load videos right now. Try refreshing.</div>';
  }
}
window.loadYoutubeVideos=loadYoutubeVideos;

async function publishArticle(){
  const title=document.getElementById('article-title').value.trim();
  const body=document.getElementById('article-body').value.trim();
  const category=document.getElementById('article-category').value;
  if(!title||!body)return alert('Please fill in title and body.');
  await db.collection('newspaper').add({title,body,category,authorName:currentUserData.name,authorUid:currentUser.uid,school:currentUserData.school,createdAt:FS.serverTimestamp()});
  closeAllModals();['article-title','article-body'].forEach(id=>document.getElementById(id).value='');
}

async function deleteArticle(id){await db.collection('newspaper').doc(id).delete();}

// Expose all new functions globally
window.reactToAnnouncement=reactToAnnouncement;
window.openSearch=openSearch;window.closeSearch=closeSearch;window.runSearch=runSearch;
window.submitTip=submitTip;window.resolveTip=resolveTip;
window.sendEmergencyAlert=sendEmergencyAlert;
window.renderAttendance=renderAttendance;window.markAttendance=markAttendance;
window.renderGradeEntry=renderGradeEntry;window.saveGrade=saveGrade;
window.renderLeaderboard=renderLeaderboard;
window.renderNewspaper=renderNewspaper;window.publishArticle=publishArticle;window.deleteArticle=deleteArticle;
window.renderTipLine=renderTipLine;
// New function exports
window.initCalendar=initCalendar;
window.renderAbsences=renderAbsences;
window.markAttendance=markAttendance;
window.postAssignment=postAssignment;
window.addCalEvent=addCalEvent;
window.deleteCalEvent=deleteCalEvent;
window.openCalDay=openCalDay;
window.changeMonth=changeMonth;

// ============================================================
// STUDENT COUNCIL ELECTIONS
// ============================================================

function renderElections(){
  const el=document.getElementById('election-list');if(!el)return;
  const unsub=db.collection('elections').where('school','==',currentUserData.school).onSnapshot(snap=>{
    const elections=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?b.createdAt.toMillis():0)-(a.createdAt?.toMillis?a.createdAt.toMillis():0));
    if(!elections.length){el.innerHTML='<div class="empty-state">No elections yet</div>';return;}
    el.innerHTML=elections.map(e=>electionCardHTML(e)).join('');
  });
  unsubscribers.push(unsub);
}

function electionCardHTML(e){
  const isAdmin=currentUserData.isAdmin;
  const isClosed=e.status==='closed';
  const positions=e.positions||[];
  const isEligible=!e.eligibleGrades||!e.eligibleGrades.length||e.eligibleGrades.includes(currentUserData.grade);
  return`<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div>
        <div style="font-size:18px;font-weight:700;color:var(--white);">${e.title}</div>
        <div style="font-size:12px;color:var(--gray);">${isClosed?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Closed — Results Revealed':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Active — Voting Open'}</div>
        ${e.eligibleGrades&&e.eligibleGrades.length?`<div style="font-size:11px;color:var(--gray);margin-top:2px;">Eligible: ${e.eligibleGrades.join(', ')}</div>`:''}
      </div>
      ${isAdmin?`<div style="display:flex;gap:8px;">
        ${!isClosed?`<button class="btn-blue btn-sm" onclick="closeElection('${e.id}')">Close & Reveal</button>`:''}
        <button class="btn-ghost btn-sm" onclick="deleteElection('${e.id}')">Delete</button>
      </div>`:''}
    </div>
    ${!isEligible?'<div style="font-size:12px;color:#f59e0b;margin-bottom:10px;">You are not eligible to vote in this election based on your grade level.</div>':''}
    ${positions.map(pos=>positionHTML(e,pos,isClosed,isEligible)).join('')}
  </div>`;
}

function positionHTML(election,pos,isClosed,isEligible=true){
  const candidates=pos.candidates||[];
  const votes=election.votes||{};
  const myVote=votes[currentUser.uid]?.[pos.id];
  const totalVotes=Object.values(votes).filter(v=>v[pos.id]).length;
  const canVote=isEligible&&!myVote&&!isClosed;
  return`<div style="margin-bottom:16px;padding:14px;background:var(--card2);border-radius:10px;">
    <div style="font-size:14px;font-weight:700;color:var(--blue-light);margin-bottom:10px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg> ${pos.title}</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${candidates.map(c=>{
        const voteCount=Object.values(votes).filter(v=>v[pos.id]===c.id).length;
        const pct=totalVotes?Math.round(voteCount/totalVotes*100):0;
        const isMyVote=myVote===c.id;
        const isWinner=isClosed&&voteCount===Math.max(...candidates.map(cc=>Object.values(votes).filter(v=>v[pos.id]===cc.id).length));
        return`<div onclick="${canVote?`castElectionVote('${election.id}','${pos.id}','${c.id}')`:''}" style="padding:10px 14px;border-radius:8px;border:2px solid ${isMyVote?'#3b82f6':isWinner&&isClosed?'#22c55e':'var(--border)'};background:${isMyVote?'rgba(59,130,246,.1)':isWinner&&isClosed?'rgba(34,197,94,.08)':'transparent'};cursor:${canVote?'pointer':'default'};transition:all .15s;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${c.photoUrl?`<div style="width:36px;height:36px;border-radius:50%;background-image:url(${c.photoUrl});background-size:cover;background-position:center;flex-shrink:0;"></div>`:''}
              ${isWinner&&isClosed?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg> ':''}${isMyVote?'<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" width="16" height="16" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg> ':''}
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--white);">${c.name}</div>
                ${c.bio?`<div style="font-size:11px;color:var(--gray);">${c.bio}</div>`:''}
              </div>
            </div>
            ${isClosed||myVote?`<span style="font-size:13px;font-weight:700;color:${isWinner&&isClosed?'#22c55e':'var(--gray)'};">${pct}% (${voteCount})</span>`:''}
          </div>
          ${(isClosed||myVote)&&totalVotes>0?`<div style="margin-top:6px;height:4px;background:var(--border);border-radius:2px;"><div style="width:${pct}%;height:100%;background:${isWinner&&isClosed?'#22c55e':'#3b82f6'};border-radius:2px;"></div></div>`:''}
        </div>`;
      }).join('')}
    </div>
    ${canVote?`<div style="font-size:11px;color:var(--gray);margin-top:8px;">Tap a candidate to vote</div>`:''}
    ${myVote?`<div style="font-size:11px;color:#22c55e;margin-top:8px;"><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" width="16" height="16" style="vertical-align:middle;"><polyline points="20,6 9,17 4,12"/></svg> You voted in this race</div>`:''}
  </div>`;
}

async function castElectionVote(electionId,positionId,candidateId){
  const ref=db.collection('elections').doc(electionId);
  const snap=await ref.get();if(!snap.exists)return;
  const data=snap.data();
  const eligibleGrades=data.eligibleGrades;
  if(eligibleGrades&&eligibleGrades.length&&!eligibleGrades.includes(currentUserData.grade)){
    return alert('You are not eligible to vote in this election based on your grade level.');
  }
  const votes=data.votes||{};
  if(votes[currentUser.uid]?.[positionId])return;// already voted
  await ref.update({[`votes.${currentUser.uid}.${positionId}`]:candidateId});
}

async function closeElection(id){
  if(!confirm('Close this election and reveal results to everyone?'))return;
  await db.collection('elections').doc(id).update({status:'closed'});
}

async function deleteElection(id){
  if(!confirm('Delete this election permanently?'))return;
  await db.collection('elections').doc(id).delete();
}

// Create election flow
let newElectionPositions=[];

function openCreateElection(){
  newElectionPositions=[];
  document.getElementById('election-positions-list').innerHTML='';
  openModal('election-modal');
}

function addElectionPosition(){
  const title=document.getElementById('election-pos-title').value.trim();
  if(!title)return alert('Enter a position title (e.g. President)');
  const id=genId();
  newElectionPositions.push({id,title,candidates:[]});
  document.getElementById('election-pos-title').value='';
  renderElectionPositionsForm();
}

function addCandidateToPosition(posId){
  const nameEl=document.getElementById('cand-name-'+posId);
  const bioEl=document.getElementById('cand-bio-'+posId);
  const fileEl=document.getElementById('cand-file-'+posId);
  if(!nameEl||!nameEl.value.trim())return alert('Enter candidate name');
  const pos=newElectionPositions.find(p=>p.id===posId);
  const file=fileEl?.files[0];
  const finishAdd=(photoUrl)=>{
    if(pos){pos.candidates.push({id:genId(),name:nameEl.value.trim(),bio:bioEl?.value.trim()||'',photoUrl:photoUrl||null});}
    nameEl.value='';if(bioEl)bioEl.value='';if(fileEl)fileEl.value='';
    renderElectionPositionsForm();
  };
  if(file){
    uploadToCloudinary(file,'image').then(result=>finishAdd(result.url)).catch(()=>finishAdd(null));
  }else{
    finishAdd(null);
  }
}

function renderElectionPositionsForm(){
  const el=document.getElementById('election-positions-list');if(!el)return;
  el.innerHTML=newElectionPositions.map(pos=>`
    <div style="background:var(--card2);border-radius:8px;padding:12px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;color:var(--blue-light);margin-bottom:8px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg> ${pos.title} <button onclick="removeElectionPosition('${pos.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">×</button></div>
      ${pos.candidates.map(c=>`<div style="font-size:12px;color:var(--gray);padding:4px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;">${c.photoUrl?`<div style="width:20px;height:20px;border-radius:50%;background-image:url(${c.photoUrl});background-size:cover;background-position:center;flex-shrink:0;"></div>`:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'} ${c.name}${c.bio?' — '+c.bio:''}</div>`).join('')}
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <input class="input" placeholder="Candidate name..." id="cand-name-${pos.id}" style="flex:1;margin:0;padding:6px 10px;font-size:12px;min-width:120px;">
        <input class="input" placeholder="Bio/speech (optional)..." id="cand-bio-${pos.id}" style="flex:2;margin:0;padding:6px 10px;font-size:12px;min-width:150px;">
        <input type="file" accept="image/*" id="cand-file-${pos.id}" style="font-size:11px;color:var(--gray);max-width:140px;">
        <button class="btn-blue btn-sm" onclick="addCandidateToPosition('${pos.id}')">+ Add</button>
      </div>
    </div>`).join('');
}

function removeElectionPosition(id){
  newElectionPositions=newElectionPositions.filter(p=>p.id!==id);
  renderElectionPositionsForm();
}

async function createElection(){
  if(!currentUserData.isAdmin)return;
  const title=document.getElementById('election-title').value.trim();
  if(!title)return alert('Enter an election title.');
  if(!newElectionPositions.length)return alert('Add at least one position.');
  if(newElectionPositions.some(p=>!p.candidates.length))return alert('Each position needs at least one candidate.');
  const eligibleGrades=Array.from(document.querySelectorAll('.election-grade-cb:checked')).map(cb=>cb.value);
  await db.collection('elections').add({
    title,positions:newElectionPositions,votes:{},eligibleGrades,
    status:'active',school:currentUserData.school,
    createdBy:currentUser.uid,createdAt:FS.serverTimestamp()
  });
  closeAllModals();
  document.getElementById('election-title').value='';
  document.querySelectorAll('.election-grade-cb').forEach(cb=>cb.checked=false);
  newElectionPositions=[];
}

// ============================================================
// GPA CALCULATOR
// ============================================================

function renderGPA(){
  const courses=lsArr('ss_gpa_'+currentUser.uid);
  const el=document.getElementById('gpa-courses');if(!el)return;
  el.innerHTML=courses.length?courses.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="flex:2;font-size:13px;color:var(--white);">${c.name}</div>
      <div style="flex:1;font-size:13px;color:var(--gray);text-align:center;">${c.grade}</div>
      <div style="flex:1;font-size:13px;color:var(--gray);text-align:center;">${c.credits} cr</div>
      <div style="flex:1;font-size:11px;text-align:center;"><span style="background:${c.weighted?'rgba(139,92,246,.2)':'rgba(59,130,246,.1)'};color:${c.weighted?'#8b5cf6':'#3b82f6'};padding:2px 6px;border-radius:6px;">${c.weighted?'Weighted':'Standard'}</span></div>
      <button onclick="deleteGPACourse(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;">×</button>
    </div>`).join(''):'<div class="empty-state">No courses added yet</div>';
  calculateGPA(courses);
}

function gradeToPoints(grade,weighted){
  const scale={'A+':4.0,'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0,'C-':1.7,'D+':1.3,'D':1.0,'D-':0.7,'F':0.0};
  const points=scale[grade]??parseFloat(grade)??0;
  return weighted?Math.min(points+1,5.0):points;
}

function calculateGPA(courses){
  if(!courses.length){
    document.getElementById('gpa-unweighted').textContent='—';
    document.getElementById('gpa-weighted').textContent='—';
    document.getElementById('gpa-letter').textContent='—';
    return;
  }
  let uwTotal=0,wTotal=0,credits=0;
  courses.forEach(c=>{
    const cr=parseFloat(c.credits)||1;
    uwTotal+=gradeToPoints(c.grade,false)*cr;
    wTotal+=gradeToPoints(c.grade,c.weighted)*cr;
    credits+=cr;
  });
  const uw=(uwTotal/credits).toFixed(2);
  const w=(wTotal/credits).toFixed(2);
  const letter=uw>=3.7?'A':uw>=3.3?'A-':uw>=3.0?'B+':uw>=2.7?'B':uw>=2.3?'B-':uw>=2.0?'C+':uw>=1.7?'C':'D';
  document.getElementById('gpa-unweighted').textContent=uw;
  document.getElementById('gpa-weighted').textContent=w;
  document.getElementById('gpa-letter').textContent=letter;
}

function addGPACourse(){
  const name=document.getElementById('gpa-course-name').value.trim();
  const grade=document.getElementById('gpa-grade').value.trim().toUpperCase();
  const credits=document.getElementById('gpa-credits').value||'1';
  const weighted=document.getElementById('gpa-weighted-check').checked;
  if(!name||!grade)return alert('Enter course name and grade.');
  const courses=lsArr('ss_gpa_'+currentUser.uid);
  courses.push({name,grade,credits,weighted});
  ls('ss_gpa_'+currentUser.uid,courses);
  renderGPA();
  ['gpa-course-name','gpa-grade'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('gpa-weighted-check').checked=false;
}

function deleteGPACourse(idx){
  const courses=lsArr('ss_gpa_'+currentUser.uid);
  courses.splice(idx,1);
  ls('ss_gpa_'+currentUser.uid,courses);
  renderGPA();
}

function clearGPA(){
  if(!confirm('Clear all courses?'))return;
  ls('ss_gpa_'+currentUser.uid,[]);
  renderGPA();
}

// ============================================================
// CLUB ROLES
// ============================================================

async function openClubRoles(){
  if(!currentClub)return;
  const snap=await db.collection('clubs').doc(currentClub.id).get();
  const data=snap.data();
  const roles=data.roles||{};// {uid: roleName}
  const customRoles=data.customRoles||[];// ['President','VP',...]
  const members=[data.president,...(data.members||[]).filter(u=>u!==data.president)];
  const userSnaps=await Promise.all(members.map(uid=>db.collection('users').doc(uid).get()));
  const users=userSnaps.filter(s=>s.exists).map(s=>s.data());

  const modal=document.getElementById('club-roles-modal');
  if(!modal)return;
  modal.querySelector('.modal-title').textContent=`Manage Roles — ${currentClub.name}`;
  document.getElementById('club-roles-list').innerHTML=users.map(u=>{
    const currentRole=u.uid===data.president?'President':roles[u.uid]||'Member';
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div class="dir-avatar" style="background:${u.avatar};width:32px;height:32px;font-size:12px;">${u.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:14px;color:var(--white);">${u.name}</div>
        <div style="font-size:11px;color:var(--blue-light);">${currentRole}</div>
      </div>
      ${u.uid!==currentUser.uid?`<select onchange="assignClubRole('${u.uid}',this.value)" style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--white);font-size:12px;">
        <option value="Member" ${currentRole==='Member'?'selected':''}>Member</option>
        ${customRoles.map(r=>`<option value="${r}" ${currentRole===r?'selected':''}>${r}</option>`).join('')}
        <option value="transfer"><svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" width="14" height="14" style="vertical-align:middle;"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg> Make President</option>
      </select>`:'<span style="font-size:11px;color:var(--gold);"><svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" width="16" height="16" style="vertical-align:middle;"><path d="M2 19l2-10 5 5 3-8 3 8 5-5 2 10H2z"/><line x1="2" y1="22" x2="22" y2="22" stroke-width="2"/></svg> You</span>'}
    </div>`;
  }).join('');
  document.getElementById('custom-roles-list').innerHTML=customRoles.map(r=>`
    <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:3px 10px;margin:3px;font-size:12px;color:var(--blue-light);">
      ${r} <button onclick="deleteCustomRole('${r}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;line-height:1;">×</button>
    </div>`).join('')||'<div style="font-size:12px;color:var(--gray);">No custom roles yet</div>';
  openModal('club-roles-modal');
}

async function assignClubRole(uid,role){
  if(!currentClub)return;
  if(role==='transfer'){
    if(!confirm('Transfer presidency to this member? You will become a regular member.'))return;
    await db.collection('clubs').doc(currentClub.id).update({president:uid});
    currentClub.president=uid;
    closeAllModals();
    alert('Presidency transferred!');
    return;
  }
  await db.collection('clubs').doc(currentClub.id).update({[`roles.${uid}`]:role});
  openClubRoles();
}

async function addCustomRole(){
  if(!currentClub)return;
  const name=document.getElementById('new-role-input').value.trim();
  if(!name)return;
  const snap=await db.collection('clubs').doc(currentClub.id).get();
  const customRoles=snap.data().customRoles||[];
  if(customRoles.includes(name))return alert('Role already exists!');
  await db.collection('clubs').doc(currentClub.id).update({customRoles:FS.arrayUnion(name)});
  document.getElementById('new-role-input').value='';
  openClubRoles();
}

async function deleteCustomRole(role){
  if(!currentClub)return;
  await db.collection('clubs').doc(currentClub.id).update({customRoles:FS.arrayRemove(role)});
  openClubRoles();
}

// Override club chat to show roles next to names
function listenClubChat(clubId){
  if(window._clubChatUnsub){window._clubChatUnsub();}
  // Get club data for roles first
  db.collection('clubs').doc(clubId).get().then(clubSnap=>{
    const clubData=clubSnap.exists?clubSnap.data():{};
    const roles=clubData.roles||{};
    window._clubChatUnsub=db.collection('clubs').doc(clubId).collection('messages').onSnapshot(snap=>{
      const msgs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.sentAt?.toMillis?a.sentAt.toMillis():0)-(b.sentAt?.toMillis?b.sentAt.toMillis():0));
      const el=document.getElementById('club-messages');if(!el)return;
      el.innerHTML=msgs.length?msgs.map(m=>{
        const role=m.uid===clubData.president?'President':roles[m.uid]||null;
        return chatMsgWithMediaHTML({...m,name:role?`${m.name} (${role})`:m.name},currentUser.uid);
      }).join(''):'<div class="empty-state">No messages yet. Say something!</div>';
      el.scrollTop=el.scrollHeight;
    });
  });
}

// Override listenClubMembers to show roles
async function listenClubMembers(clubId){
  const snap=await db.collection('clubs').doc(clubId).get();
  if(!snap.exists)return;
  const data=snap.data();
  const roles=data.roles||{};
  const memberUids=[data.president,...(data.members||[]).filter(u=>u!==data.president)];
  const userSnaps=await Promise.all(memberUids.map(uid=>db.collection('users').doc(uid).get()));
  const el=document.getElementById('club-members-list');if(!el)return;
  el.innerHTML=userSnaps.filter(s=>s.exists).map(s=>{
    const u=s.data();
    const isPresident=u.uid===data.president;
    const role=isPresident?'President':roles[u.uid]||'Member';
    const roleColor=isPresident?'#f59e0b':role==='Member'?'#64748b':'#3b82f6';
    return`<div class="dir-item">
      <div class="dir-avatar" style="background:${u.avatar}">${u.name[0]}</div>
      <div style="flex:1"><div class="dir-name">${u.name}</div><div class="dir-school">${u.email}</div></div>
      <span style="font-size:11px;background:rgba(59,130,246,.1);color:${roleColor};padding:2px 8px;border-radius:10px;font-weight:600;">${isPresident?'<svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" width="16" height="16" style="vertical-align:middle;"><path d="M2 19l2-10 5 5 3-8 3 8 5-5 2 10H2z"/><line x1="2" y1="22" x2="22" y2="22" stroke-width="2"/></svg> ':''} ${role}</span>
    </div>`;
  }).join('');
}

// Expose all new globals
window.renderElections=renderElections;
window.openCreateElection=openCreateElection;
window.addElectionPosition=addElectionPosition;
window.addCandidateToPosition=addCandidateToPosition;
window.removeElectionPosition=removeElectionPosition;
window.createElection=createElection;
window.castElectionVote=castElectionVote;
window.closeElection=closeElection;
window.deleteElection=deleteElection;
window.renderGPA=renderGPA;
window.addGPACourse=addGPACourse;
window.deleteGPACourse=deleteGPACourse;
window.clearGPA=clearGPA;
window.openClubRoles=openClubRoles;
window.assignClubRole=assignClubRole;
window.addCustomRole=addCustomRole;
window.deleteCustomRole=deleteCustomRole;
window.listenClubChat=listenClubChat;
window.listenClubMembers=listenClubMembers;
window.renderClubPortal=renderClubPortal;window.joinClubByCode=joinClubByCode;
async function deleteAssignment(assignmentId){
  if(!currentClass)return;
  if(!confirm('Delete this assignment?'))return;
  const assignments=(currentClass.assignments||[]).filter(a=>a.id!==assignmentId);
  await db.collection('classrooms').doc(currentClass.id).update({assignments});
  currentClass.assignments=assignments;
  renderClassroomDetail();
}
window.deleteAssignment=deleteAssignment;

// ============================================================
// NOTIFICATION BADGE SYSTEM
// ============================================================

const BADGE_PAGES = ['announcements','classroom','clubs','sports','polls','lost','carpool','chat','tips','newspaper','elections','studygroups','absences','deadlines','countdown'];

function getBadgeKey(page){ return `ss_lastseen_${currentUser.uid}_${page}`; }
function getLastSeen(page){ return parseInt(ls(getBadgeKey(page))||'0'); }
function markSeen(page){ ls(getBadgeKey(page), Date.now().toString()); setBadge(page,0); }

function setBadge(page, count){
  const badge=document.getElementById(`badge-${page}`);
  if(!badge)return;
  if(count>0){
    badge.textContent=count>99?'99+':count;
    badge.style.display='inline-flex';
  }else{
    badge.style.display='none';
  }
}

function updateBadge(page, count){ setBadge(page, count); }

// Listen to all collections and update badges in real time
function initNotificationBadges(){
  const school=currentUserData.school;
  const uid=currentUser.uid;

  // ANNOUNCEMENTS
  db.collection('announcements').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('announcements');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('announcements',newCount);
  });

  // SPORTS
  db.collection('sports').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('sports');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('sports',newCount);
  });

  // POLLS
  db.collection('polls').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('polls');
    const unvoted=snap.docs.filter(d=>{
      const data=d.data();
      const t=data.createdAt?.toMillis?data.createdAt.toMillis():0;
      const voted=(data.votes||{})[uid]!==undefined;
      return t>lastSeen&&!voted;
    }).length;
    setBadge('polls',unvoted);
  });

  // LOST & FOUND
  db.collection('lostfound').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('lost');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('lost',newCount);
  });

  // CARPOOL
  db.collection('carpool').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('carpool');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('carpool',newCount);
  });

  // GROUP CHATS — unread messages
  db.collection('chats').where('school','==',school).where('memberEmails','array-contains',currentUserData.email).onSnapshot(snap=>{
    const lastSeen=getLastSeen('chat');
    let total=0;
    snap.docs.forEach(d=>{
      const t=d.data().lastMessageAt?.toMillis?d.data().lastMessageAt.toMillis():(d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0);
      if(t>lastSeen)total++;
    });
    setBadge('chat',total);
  });

  // NEWSPAPER
  db.collection('newspaper').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('newspaper');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('newspaper',newCount);
  });

  // ELECTIONS
  db.collection('elections').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('elections');
    const newCount=snap.docs.filter(d=>{
      const data=d.data();
      const t=data.createdAt?.toMillis?data.createdAt.toMillis():0;
      return t>lastSeen&&data.status==='active';
    }).length;
    setBadge('elections',newCount);
  });

  // STUDY GROUPS
  db.collection('studygroups').where('school','==',school).onSnapshot(snap=>{
    const lastSeen=getLastSeen('studygroups');
    const newCount=snap.docs.filter(d=>{
      const data=d.data();
      const t=data.createdAt?.toMillis?data.createdAt.toMillis():0;
      const full=(data.members||[]).length>=data.spots;
      return t>lastSeen&&!full;
    }).length;
    setBadge('studygroups',newCount);
  });

  // TIPS (admin/teacher only)
  if(currentUserData.isAdmin||currentUserData.isTeacher){
    db.collection('tips').where('school','==',school).onSnapshot(snap=>{
      const lastSeen=getLastSeen('tips');
      const newCount=snap.docs.filter(d=>{
        const data=d.data();
        const t=data.createdAt?.toMillis?data.createdAt.toMillis():0;
        return t>lastSeen&&!data.resolved;
      }).length;
      setBadge('tips',newCount);
    });
  }

  // ABSENCES — student gets badge when teacher logs one
  db.collection('studentAbsences').where('uid','==',uid).onSnapshot(snap=>{
    const lastSeen=getLastSeen('absences');
    const newCount=snap.docs.filter(d=>{const t=d.data().createdAt?.toMillis?d.data().createdAt.toMillis():0;return t>lastSeen;}).length;
    setBadge('absences',newCount);
  });

  // DEADLINES — due in 3 days or less
  const deadlines=lsArr('ss_deadlines_'+uid);
  const urgentDeadlines=deadlines.filter(d=>{const days=daysDiff(d.date);return days>=0&&days<=3;}).length;
  setBadge('deadlines',urgentDeadlines);

  // EXAM COUNTDOWN — due in 3 days or less
  const exams=lsArr('ss_exams_'+uid);
  const urgentExams=exams.filter(e=>{const days=daysDiff(e.date);return days>=0&&days<=3;}).length;
  setBadge('countdown',urgentExams);

  // CLASSROOMS — new assignments
  db.collection('classrooms').where('school','==',school).where('students','array-contains',uid).onSnapshot(snap=>{
    const lastSeen=getLastSeen('classroom');
    let newAssignments=0;
    snap.docs.forEach(d=>{
      const assignments=d.data().assignments||[];
      assignments.forEach(a=>{
        const t=a.createdAt?new Date(a.createdAt).getTime():0;
        if(t>lastSeen)newAssignments++;
      });
    });
    setBadge('classroom',newAssignments);
  });

  // CLUBS — new messages in your clubs
  db.collection('clubs').where('school','==',school).onSnapshot(snap=>{
    const myClubs=snap.docs.filter(d=>{
      const data=d.data();
      return (data.members||[]).includes(uid)||data.president===uid;
    });
    const lastSeen=getLastSeen('clubs');
    // We can't easily check subcollection messages here, so just badge if new club joined
    setBadge('clubs',0);// Will be set by club portal
  });
}

// Override nav to mark page as seen when visited
const _navWithBadge=nav;
window.nav=function(page){
  _navWithBadge(page);
  // Map page names to badge IDs
  const pageMap={
    'announcements':'announcements','classroom':'classroom','clubs':'clubs',
    'sports':'sports','polls':'polls','lost':'lost','carpool':'carpool',
    'chat':'chat','tips':'tips','newspaper':'newspaper','elections':'elections',
    'studygroups':'studygroups','absences':'absences','deadlines':'deadlines',
    'countdown':'countdown'
  };
  if(pageMap[page])markSeen(pageMap[page]);
};

window.initNotificationBadges=initNotificationBadges;
window.setBadge=setBadge;
window.markSeen=markSeen;


// ---- TEACHER MESSAGE POPUP (big, 2 min) ----
let _teacherMsgTimeout = null;
let _teacherMsgCountdown = null;
let _lastShownMsg = '';

function showTeacherMessagePopup(message, teacherName){
  // Don't show the same message twice
  if(message === _lastShownMsg) return;
  _lastShownMsg = message;

  // Remove existing popup if any
  const existing = document.getElementById('teacher-msg-popup');
  if(existing) existing.remove();
  clearTimeout(_teacherMsgTimeout);
  clearInterval(_teacherMsgCountdown);

  const totalSecs = 120; // 2 minutes
  let remaining = totalSecs;

  const popup = document.createElement('div');
  popup.id = 'teacher-msg-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    z-index: 9999;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    border: 2px solid #3b82f6;
    border-radius: 20px;
    padding: 32px;
    max-width: 90%;
    width: 420px;
    box-shadow: 0 25px 60px rgba(0,0,0,.8), 0 0 0 1px rgba(59,130,246,.3);
    text-align: center;
    animation: popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
  `;

  popup.innerHTML = `
    <div style="font-size:13px;color:#3b82f6;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" width="18" height="18" style="vertical-align:middle;margin-right:6px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      Message from ${teacherName}
    </div>
    <div style="font-size:26px;font-weight:800;color:white;line-height:1.3;margin-bottom:20px;">${message}</div>
    <div id="teacher-msg-countdown" style="font-size:12px;color:#64748b;margin-bottom:16px;">Disappears in <span id="msg-secs">${totalSecs}</span>s</div>
    <button onclick="dismissTeacherMsg()" style="background:rgba(59,130,246,.15);border:1px solid #3b82f6;color:#3b82f6;border-radius:10px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer;">Got it</button>
  `;

  // Add animation keyframes if not already added
  if(!document.getElementById('popup-anim-style')){
    const style = document.createElement('style');
    style.id = 'popup-anim-style';
    style.textContent = `
      @keyframes popupIn {
        from { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
        to { transform: translate(-50%,-50%) scale(1); opacity: 1; }
      }
      @keyframes popupOut {
        from { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        to { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
      }
      #teacher-msg-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 9998;
      }
    `;
    document.head.appendChild(style);
  }

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'teacher-msg-overlay';
  overlay.onclick = dismissTeacherMsg;
  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // Countdown timer
  _teacherMsgCountdown = setInterval(()=>{
    remaining--;
    const secsEl = document.getElementById('msg-secs');
    if(secsEl) secsEl.textContent = remaining;
    if(remaining <= 0) dismissTeacherMsg();
  }, 1000);

  // Auto dismiss after 2 minutes
  _teacherMsgTimeout = setTimeout(dismissTeacherMsg, totalSecs * 1000);
}

function dismissTeacherMsg(){
  clearTimeout(_teacherMsgTimeout);
  clearInterval(_teacherMsgCountdown);
  const popup = document.getElementById('teacher-msg-popup');
  const overlay = document.getElementById('teacher-msg-overlay');
  if(popup){
    popup.style.animation = 'popupOut 0.3s ease forwards';
    setTimeout(()=>popup.remove(), 300);
  }
  if(overlay) overlay.remove();
}

window.showTeacherMessagePopup = showTeacherMessagePopup;
window.dismissTeacherMsg = dismissTeacherMsg;
window.getMyMascot=getMyMascot;

// ============================================================
// BATCH A — NOTIFICATIONS, HOMEWORK SUBMISSION, STATUS, REACTIONS, SEEN
// ============================================================

// ---- 1. PUSH NOTIFICATIONS ----
async function requestNotificationPermission(){
  if(!('Notification' in window))return;
  if(Notification.permission==='default'){
    const perm=await Notification.requestPermission();
    if(perm==='granted') showLocalNotification('ScholarSync','Notifications enabled! You\'ll be notified of important updates.');
  }
}

function showLocalNotification(title, body, icon='/logo.png'){
  if(Notification.permission!=='granted')return;
  const n=new Notification(title,{body,icon});
  setTimeout(()=>n.close(),5000);
  return n;
}

function notifyUser(title, body){
  // Show if page is hidden or in background
  if(document.hidden){
    showLocalNotification(title,body);
  }else{
    // Show in-app toast
    showToast(title+': '+body);
  }
}

function showToast(message, type='info'){
  const existing=document.getElementById('ss-toast');
  if(existing)existing.remove();
  const toast=document.createElement('div');
  toast.id='ss-toast';
  const color=type==='success'?'#22c55e':type==='error'?'#ef4444':'#3b82f6';
  toast.style.cssText=`position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid ${color};border-radius:12px;padding:12px 20px;font-size:13px;color:white;z-index:9999;max-width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.5);animation:slideUp .3s ease;`;
  toast.textContent=message;
  if(!document.getElementById('toast-style')){
    const s=document.createElement('style');
    s.id='toast-style';
    s.textContent='@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(()=>{toast.style.opacity='0';toast.style.transition='opacity .3s';setTimeout(()=>toast.remove(),300)},3000);
}

// Listen for notifications relevant to current user
function initNotificationListeners(){
  requestNotificationPermission();
  const school=currentUserData.school;
  const uid=currentUser.uid;

  // New announcements
  db.collection('announcements').where('school','==',school).onSnapshot(snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type==='added'&&change.doc.data().postedBy!==uid){
        const data=change.doc.data();
        if(data.createdAt?.toMillis&&Date.now()-data.createdAt.toMillis()<10000){
          notifyUser('New Announcement',data.title);
        }
      }
    });
  });

  // Hall pass status changes
  db.collection('hallpasses').where('studentUid','==',uid).onSnapshot(snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type==='modified'){
        const data=change.doc.data();
        if(data.status==='active') notifyUser('Hall Pass Approved','Your pass has been approved!');
        if(data.status==='denied') notifyUser('Hall Pass Denied','Your pass request was denied.');
        if(data.message&&data.status==='active') notifyUser('Teacher Message',data.message);
      }
    });
  });

  // New assignments in your classes
  db.collection('classrooms').where('school','==',school).where('students','array-contains',uid).onSnapshot(snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type==='modified'){
        const newData=change.doc.data();
        const assignments=newData.assignments||[];
        if(assignments.length){
          const latest=assignments[assignments.length-1];
          if(latest.createdAt&&Date.now()-new Date(latest.createdAt).getTime()<10000){
            notifyUser('New Assignment',`${latest.name} posted in ${newData.name}`);
          }
        }
      }
    });
  });

  // Absence logged by teacher
  db.collection('studentAbsences').where('uid','==',uid).onSnapshot(snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type==='added'){
        const data=change.doc.data();
        if(data.createdAt?.toMillis&&Date.now()-data.createdAt.toMillis()<10000){
          notifyUser('Absence Logged',`${data.type} logged for ${data.cls}`);
        }
      }
    });
  });
}

// ---- 2. HOMEWORK SUBMISSION ----
async function submitHomework(assignmentId, classId, studentUid){
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*,.pdf,.doc,.docx';
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;
    showToast('Uploading submission...');
    try{
      const result=await uploadToCloudinary(file,'image');
      await db.collection('submissions').add({
        assignmentId,classId,studentUid,
        studentName:currentUserData.name,
        fileUrl:result.url,
        fileName:file.name,
        fileType:file.type,
        submittedAt:FS.serverTimestamp(),
        school:currentUserData.school
      });
      showToast('Homework submitted!','success');
    }catch(e){showToast('Upload failed: '+e.message,'error');}
  };
  input.click();
}

async function renderSubmissions(assignmentId, classId){
  const el=document.getElementById('submissions-'+assignmentId);if(!el)return;
  const snap=await db.collection('submissions').where('assignmentId','==',assignmentId).where('classId','==',classId).get();
  const subs=snap.docs.map(d=>({id:d.id,...d.data()}));
  el.innerHTML=subs.length?subs.map(s=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
      <div style="flex:1;color:var(--white);">${s.studentName}</div>
      <a href="${s.fileUrl}" target="_blank" style="color:var(--blue-light);">View ${s.fileName}</a>
      <span style="color:var(--gray);font-size:10px;">${s.submittedAt?.toDate?s.submittedAt.toDate().toLocaleDateString():''}</span>
    </div>`).join(''):'<div style="font-size:12px;color:var(--gray);">No submissions yet</div>';
}

// ---- 3. USER STATUS ----
const STATUS_OPTIONS=[
  {key:'online',label:'Online',color:'#22c55e'},
  {key:'studying',label:'Studying',color:'#3b82f6'},
  {key:'inclass',label:'In Class',color:'#f59e0b'},
  {key:'practice',label:'At Practice',color:'#8b5cf6'},
  {key:'busy',label:'Busy',color:'#ef4444'},
  {key:'free',label:'Free',color:'#22c55e'},
  {key:'away',label:'Away',color:'#64748b'},
];

// (setStatus, updateStatusDisplay, statusDotHTML, renderStatusPicker fully implemented below — duplicates removed)

// ---- 4. CHAT MESSAGE REACTIONS ----
async function reactToMessage(collection, docId, msgId, emoji){
  const ref=db.collection(collection).doc(docId).collection('messages').doc(msgId);
  const snap=await ref.get();if(!snap.exists)return;
  const reactions=snap.data().reactions||{};
  const myReactions=reactions[currentUser.uid]||{};
  if(myReactions[emoji]){
    const updated={...myReactions};delete updated[emoji];
    await ref.update({[`reactions.${currentUser.uid}`]:updated});
  }else{
    await ref.update({[`reactions.${currentUser.uid}`]:{...myReactions,[emoji]:true}});
  }
}

// (msgReactionsHTML, reactToMessage, showReactionPicker were dead code never called from any live render path — removed)

// ---- 5. MESSAGE SEEN RECEIPTS ----
async function markMessageSeen(collection, docId, msgId){
  if(!msgId)return;
  const ref=db.collection(collection).doc(docId).collection('messages').doc(msgId);
  await ref.update({[`seenBy.${currentUser.uid}`]:true}).catch(()=>{});
}

// (seenReceiptHTML fully implemented below matching actual caller signature — duplicate removed)

window.requestNotificationPermission=requestNotificationPermission;
window.showLocalNotification=showLocalNotification;
window.notifyUser=notifyUser;
window.showToast=showToast;
window.initNotificationListeners=initNotificationListeners;
window.submitHomework=submitHomework;
window.renderSubmissions=renderSubmissions;
window.reactToMessage=reactToMessage;
window.markMessageSeen=markMessageSeen;

// ============================================================
// VIDEO CALLS — DAILY.CO
// ============================================================

const DAILY_API_KEY = '846c87f815b150f0e69b66576d3cb6297861e2a372f263a13af88586eb867df2';
const DAILY_DOMAIN = 'scholarsync';
let _dailyCallFrame = null;
let _activeCallId = null;

// Create a Daily room via REST API
async function createDailyRoom(roomName){
  const cleanRoom = 'ss' + roomName.replace(/[^a-zA-Z0-9]/g,'').slice(0,40) + Date.now().toString(36).slice(-4);
  try{
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: cleanRoom,
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now()/1000) + 14400 // expires in 4 hours
        }
      })
    });
    const data = await res.json();
    if(data.error) throw new Error(data.info || data.error);
    return `https://${DAILY_DOMAIN}.daily.co/${cleanRoom}`;
  }catch(e){
    console.error('Daily room creation failed:', e);
    // Fallback — just use a predictable room name without REST API
    return `https://${DAILY_DOMAIN}.daily.co/${cleanRoom}`;
  }
}

// ---- START A CALL ----
async function startCall(roomId, roomName, isTeacher){
  const restriction = await db.collection('callRestrictions').doc(currentUser.uid).get();
  if(restriction.exists){
    const data = restriction.data();
    if(data.banned) return alert('You are banned from video calls.');
    if(data.suspended && data.suspendedUntil?.toDate && data.suspendedUntil.toDate() > new Date()){
      return alert(`You are suspended from calls until ${data.suspendedUntil.toDate().toLocaleDateString()}.`);
    }
  }

  const callUrl = await createDailyRoom(roomId);

  await db.collection('activeCalls').doc(roomId).set({
    roomId, roomName, callUrl,
    startedBy: currentUser.uid,
    startedByName: currentUserData.name,
    school: currentUserData.school,
    participants: [currentUser.uid],
    startedAt: FS.serverTimestamp(),
    active: true
  });

  _activeCallId = roomId;
  openDailyCall(callUrl, roomName, true);
}

async function joinCall(roomId, roomName){
  const restriction = await db.collection('callRestrictions').doc(currentUser.uid).get();
  if(restriction.exists){
    const data = restriction.data();
    if(data.banned) return alert('You are banned from video calls.');
    if(data.suspended && data.suspendedUntil?.toDate && data.suspendedUntil.toDate() > new Date()){
      return alert(`You are suspended from calls until ${data.suspendedUntil.toDate().toLocaleDateString()}.`);
    }
  }
  const callSnap = await db.collection('activeCalls').doc(roomId).get();
  if(!callSnap.exists || !callSnap.data().active) return alert('This call has ended.');
  const callUrl = callSnap.data().callUrl;

  await db.collection('activeCalls').doc(roomId).update({
    participants: FS.arrayUnion(currentUser.uid)
  });
  _activeCallId = roomId;
  openDailyCall(callUrl, roomName, false);
}

function openDailyCall(callUrl, roomName, isHost){
  const existing = document.getElementById('call-overlay');
  if(existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'call-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9000;
    background: #0f172a;
    display: flex; flex-direction: column;
  `;

  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1e293b;border-bottom:1px solid #334155;">
      <div>
        <div style="font-size:16px;font-weight:700;color:white;">${roomName}</div>
        <div style="font-size:12px;color:#64748b;" id="call-participant-count">Connecting...</div>
      </div>
      <div style="display:flex;gap:8px;">
        ${isHost?`<button onclick="endCallForAll()" style="background:#ef4444;color:white;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;">End for Everyone</button>`:''}
        <button onclick="leaveCall()" style="background:#374151;color:white;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;">Leave Call</button>
      </div>
    </div>
    <div id="daily-container" style="flex:1;position:relative;"></div>
  `;

  document.body.appendChild(overlay);

  // Load Daily script if not loaded
  if(!window.DailyIframe){
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.onload = () => initDaily(callUrl, isHost);
    document.head.appendChild(script);
  }else{
    initDaily(callUrl, isHost);
  }

  // Listen for call state in real time
  if(window._callUnsub) window._callUnsub();
  window._callUnsub = db.collection('activeCalls').doc(_activeCallId).onSnapshot(snap=>{
    if(!snap.exists || !snap.data().active){
      leaveCall();
      return;
    }
    const data = snap.data();
    const count = (data.participants||[]).length;
    const countEl = document.getElementById('call-participant-count');
    if(countEl) countEl.textContent = `${count} participant${count!==1?'s':''}`;
  });
}

function initDaily(callUrl, isHost){
  const container = document.getElementById('daily-container');
  if(!container) return;

  _dailyCallFrame = window.DailyIframe.createFrame(container, {
    showLeaveButton: false,
    showFullscreenButton: true,
    iframeStyle: {
      width: '100%',
      height: '100%',
      border: '0',
    },
  });

  _dailyCallFrame.join({
    url: callUrl,
    userName: currentUserData.name,
  });

  _dailyCallFrame.on('left-meeting', () => {
    leaveCall();
  });
}

function muteParticipant(sessionId){
  if(_dailyCallFrame) _dailyCallFrame.updateParticipant(sessionId, {setAudio: false});
}

function kickParticipant(sessionId){
  if(_dailyCallFrame) _dailyCallFrame.updateParticipant(sessionId, {eject: true});
}

async function leaveCall(){
  if(_dailyCallFrame){
    try{ await _dailyCallFrame.leave(); }catch(e){}
    _dailyCallFrame.destroy();
    _dailyCallFrame = null;
  }
  if(_activeCallId){
    await db.collection('activeCalls').doc(_activeCallId).update({
      participants: FS.arrayRemove(currentUser.uid)
    }).catch(()=>{});
  }
  if(window._callUnsub){ window._callUnsub(); window._callUnsub = null; }
  const overlay = document.getElementById('call-overlay');
  if(overlay) overlay.remove();
  _activeCallId = null;
}

async function endCallForAll(){
  if(!confirm('End the call for everyone?')) return;
  if(_activeCallId){
    await db.collection('activeCalls').doc(_activeCallId).update({active: false});
  }
  leaveCall();
}

// ---- CALL RESTRICTIONS ----
async function applyCallRestriction(uid, type, days){
  const data = {school: currentUserData.school, appliedBy: currentUser.uid, updatedAt: FS.serverTimestamp()};
  if(type === 'ban') data.banned = true;
  else if(type === 'suspend'){
    data.suspended = true;
    data.suspendedUntil = firebase.firestore.Timestamp.fromDate(new Date(Date.now() + days*86400000));
  }else if(type === 'lift'){
    await db.collection('callRestrictions').doc(uid).delete();
    alert('Call restriction lifted!');
    return;
  }
  await db.collection('callRestrictions').doc(uid).set(data, {merge: true});
  alert('Call restriction applied!');
}

// ---- CLASSROOM CALL ----
function listenClassroomCall(classId){
  if(window._classCallUnsub) window._classCallUnsub();
  window._classCallUnsub = db.collection('activeCalls').doc(classId).onSnapshot(snap=>{
    const btn = document.getElementById('classroom-call-btn');
    if(!btn) return;
    if(snap.exists && snap.data().active){
      const data = snap.data();
      const isHost = data.startedBy === currentUser.uid;
      if(isHost){
        btn.innerHTML = `<button onclick="endCallForAll()" style="background:#ef4444;color:white;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;width:100%;">End Call</button>`;
      }else{
        btn.innerHTML = `<button onclick="joinCall('${classId}','${currentClass?.name||'Class'} Call')" style="background:#22c55e;color:white;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;width:100%;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;margin-right:6px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Join Call
        </button>`;
      }
    }else{
      const isTeacher = (currentUserData.isTeacher||currentUserData.isAdmin) && currentClass?.teacherUid===currentUser.uid;
      if(isTeacher){
        btn.innerHTML = `<button onclick="startCall('${classId}','${currentClass?.name||'Class'} Call',true)" style="background:#1a56db;color:white;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;width:100%;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align:middle;margin-right:6px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Start Call
        </button>`;
      }else{
        btn.innerHTML = `<div style="font-size:13px;color:var(--gray);text-align:center;padding:10px;">No active call</div>`;
      }
    }
  });
}

// ---- CHAT CALL ----
function listenChatCall(chatId, chatName){
  if(window._chatCallUnsub) window._chatCallUnsub();
  window._chatCallUnsub = db.collection('activeCalls').doc(chatId).onSnapshot(snap=>{
    const btn = document.getElementById('chat-call-btn');
    if(!btn) return;
    if(snap.exists && snap.data().active){
      const data = snap.data();
      const isHost = data.startedBy === currentUser.uid;
      btn.innerHTML = isHost
        ? `<button onclick="endCallForAll()" style="background:#ef4444;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">End Call</button>`
        : `<button onclick="joinCall('${chatId}','${chatName}')" style="background:#22c55e;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">Join Call</button>`;
    }else{
      btn.innerHTML = `<button onclick="startCall('${chatId}','${chatName} Call',false)" style="background:#1a56db;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="vertical-align:middle;margin-right:4px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        Start Call
      </button>`;
    }
  });
}

// Export all
window.startCall=startCall;window.joinCall=joinCall;window.leaveCall=leaveCall;
window.endCallForAll=endCallForAll;window.muteParticipant=muteParticipant;
window.kickParticipant=kickParticipant;window.applyCallRestriction=applyCallRestriction;
window.listenClassroomCall=listenClassroomCall;window.listenChatCall=listenChatCall;

// ============================================================
// BATCH A — PUSH NOTIFS, HW SUBMISSION, STATUS, REACTIONS, SEEN
// ============================================================

// ---- 1. PUSH NOTIFICATIONS ----
async function initPushNotifications(){
  if(!('Notification' in window))return;
  if(Notification.permission==='default'){
    await Notification.requestPermission();
  }
}

function sendPushNotif(title, body, icon='/logo.png'){
  if(Notification.permission!=='granted')return;
  try{
    new Notification(title,{body,icon,badge:'/logo.png',tag:'scholarsync'});
  }catch(e){}
}

// (Push notification logic merged into renderAnnouncements above — duplicate function removed)

// ---- 2. HOMEWORK SUBMISSION ----
async function submitHomeworkFile(assignmentId, assignmentName){
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*,.pdf,.doc,.docx,.ppt,.pptx';
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;
    if(file.size>10*1024*1024)return alert('File must be under 10MB.');
    const btn=document.getElementById('submit-btn-'+assignmentId);
    if(btn){btn.textContent='Uploading...';btn.disabled=true;}
    try{
      const isImage=file.type.startsWith('image/');
      const result=await uploadToCloudinary(file, isImage?'image':'image');
      // Save submission to Firestore
      await db.collection('submissions').add({
        assignmentId,assignmentName,
        classId:currentClass.id,
        studentUid:currentUser.uid,
        studentName:currentUserData.name,
        fileUrl:result.url,
        fileName:file.name,
        fileType:file.type,
        submittedAt:FS.serverTimestamp(),
        school:currentUserData.school,
      });
      if(btn){btn.textContent='Submitted ✓';btn.style.background='#22c55e';}
      sendPushNotif('Submission Received','Your work for "'+assignmentName+'" was submitted successfully!');
      alert('Submitted successfully!');
    }catch(e){
      alert('Upload failed: '+e.message);
      if(btn){btn.textContent='Submit Work';btn.disabled=false;}
    }
  };
  input.click();
}

async function viewSubmissions(assignmentId, assignmentName){
  const snap=await db.collection('submissions')
    .where('assignmentId','==',assignmentId)
    .where('classId','==',currentClass.id)
    .get();
  const subs=snap.docs.map(d=>d.data());
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:600;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:24px;width:90%;max-width:500px;max-height:80vh;overflow-y:auto;">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
      <div style="font-size:18px;font-weight:700;color:var(--white);">Submissions — ${assignmentName}</div>
      <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:var(--gray);font-size:20px;cursor:pointer;">×</button>
    </div>
    ${subs.length?subs.map(s=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <div><div style="font-size:14px;font-weight:600;color:var(--white);">${s.studentName}</div><div style="font-size:11px;color:var(--gray);">${s.fileName} • ${s.submittedAt?.toDate?s.submittedAt.toDate().toLocaleDateString():'Just now'}</div></div>
      <a href="${s.fileUrl}" target="_blank" style="background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid #3b82f6;border-radius:8px;padding:6px 12px;font-size:12px;text-decoration:none;">View</a>
    </div>`).join(''):'<div class="empty-state">No submissions yet</div>'}
  </div>`;
  document.body.appendChild(modal);
}

// ---- 3. STATUS / AWAY MESSAGE ----

async function setStatus(statusKey){
  const status=STATUS_OPTIONS.find(s=>s.key===statusKey)||STATUS_OPTIONS[0];
  await db.collection('users').doc(currentUser.uid).update({status:statusKey,statusLabel:status.label,statusColor:status.color,statusUpdatedAt:FS.serverTimestamp()});
  currentUserData.status=statusKey;
  currentUserData.statusLabel=status.label;
  currentUserData.statusColor=status.color;
  updateStatusDisplay();
  renderStatusPicker();
  closeAllModals();
}

function updateStatusDisplay(){
  const dot=document.getElementById('sidebar-status-dot');
  const label=document.getElementById('sidebar-status-label');
  const color=currentUserData?.statusColor||'#22c55e';
  const lbl=currentUserData?.statusLabel||'Online';
  if(dot)dot.style.background=color;
  if(label){label.textContent=lbl;label.style.color=color;}
}
window.updateStatusDisplay=updateStatusDisplay;

function statusBadgeHTML(status, size=10){
  const s=STATUS_OPTIONS.find(o=>o.key===status)||STATUS_OPTIONS[0];
  return`<span style="width:${size}px;height:${size}px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0;" title="${s.label}"></span>`;
}

function renderStatusPicker(){
  const el=document.getElementById('status-picker');if(!el)return;
  const current=currentUserData.status||'online';
  el.innerHTML=STATUS_OPTIONS.map(s=>`
    <div onclick="setStatus('${s.key}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;background:${current===s.key?'rgba(59,130,246,.15)':'transparent'};border:1px solid ${current===s.key?'#3b82f6':'transparent'};">
      <span style="width:12px;height:12px;border-radius:50%;background:${s.color};flex-shrink:0;"></span>
      <span style="font-size:14px;color:var(--white);">${s.label}</span>
      ${current===s.key?'<span style="margin-left:auto;color:#3b82f6;font-size:12px;">✓</span>':''}
    </div>`).join('');
}

// ---- 4. CHAT MESSAGE REACTIONS ----
const MSG_REACTIONS=['👍','❤️','😂','🔥','😮','👏'];

function showMsgReactionPicker(msgId, chatCollection, chatId){
  // Remove existing picker
  document.querySelectorAll('.msg-reaction-picker').forEach(el=>el.remove());
  const picker=document.createElement('div');
  picker.className='msg-reaction-picker';
  picker.style.cssText='position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;display:flex;gap:6px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.4);';
  picker.innerHTML=MSG_REACTIONS.map(e=>`<button onclick="addMsgReaction('${msgId}','${e}','${chatCollection}','${chatId}');this.closest('.msg-reaction-picker').remove();" style="background:none;border:none;font-size:20px;cursor:pointer;padding:4px;border-radius:6px;transition:transform .1s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${e}</button>`).join('');
  return picker;
}

async function addMsgReaction(msgId, emoji, chatCollection, chatId){
  const ref=db.collection(chatCollection).doc(chatId).collection('messages').doc(msgId);
  const snap=await ref.get();if(!snap.exists)return;
  const reactions=snap.data().reactions||{};
  const myReaction=reactions[currentUser.uid];
  if(myReaction===emoji){
    // Remove reaction
    const updated={...reactions};delete updated[currentUser.uid];
    await ref.update({reactions:updated});
  }else{
    await ref.update({[`reactions.${currentUser.uid}`]:emoji});
  }
}

function msgReactionsHTML(reactions){
  if(!reactions||!Object.keys(reactions).length)return'';
  const counts={};
  Object.values(reactions).forEach(e=>{counts[e]=(counts[e]||0)+1;});
  return`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">
    ${Object.entries(counts).map(([e,c])=>`<span style="background:rgba(255,255,255,.08);border:1px solid var(--border);border-radius:10px;padding:1px 6px;font-size:12px;">${e} ${c}</span>`).join('')}
  </div>`;
}

// ---- 5. MESSAGE SEEN RECEIPTS ----
async function markMsgSeen(chatId, msgId){
  await db.collection('chats').doc(chatId).collection('messages').doc(msgId).update({
    [`seenBy.${currentUser.uid}`]:true
  }).catch(()=>{});
}

function seenReceiptHTML(seenBy, memberCount){
  const count=Object.keys(seenBy||{}).length;
  if(count===0)return'';
  return`<div style="font-size:10px;color:var(--gray);text-align:right;margin-top:2px;">Seen by ${count}</div>`;
}

// (renderAnnouncements already includes push notification logic natively — no override needed)

// Export all Batch A
window.initPushNotifications=initPushNotifications;
window.sendPushNotif=sendPushNotif;
window.submitHomeworkFile=submitHomeworkFile;
window.viewSubmissions=viewSubmissions;
window.setStatus=setStatus;
window.statusBadgeHTML=statusBadgeHTML;
window.renderStatusPicker=renderStatusPicker;
window.showMsgReactionPicker=showMsgReactionPicker;
window.addMsgReaction=addMsgReaction;
window.msgReactionsHTML=msgReactionsHTML;
window.markMsgSeen=markMsgSeen;
window.seenReceiptHTML=seenReceiptHTML;

// ============================================================
// FLOATING QUICK-ADD BUTTON
// ============================================================
function toggleQuickAdd(){
  const menu=document.getElementById('quick-add-menu');
  if(!menu)return;
  menu.style.display=menu.style.display==='none'?'block':'none';
}
function quickAddOpen(type){
  document.getElementById('quick-add-menu').style.display='none';
  if(type==='hw')openModal('hw-modal');
  else if(type==='reminder')openModal('rem-modal');
  else if(type==='deadline')openModal('dl-modal');
}
// Close quick-add menu when clicking elsewhere
document.addEventListener('click',(e)=>{
  const fab=document.getElementById('quick-add-fab');
  if(fab&&!fab.contains(e.target)){
    const menu=document.getElementById('quick-add-menu');
    if(menu)menu.style.display='none';
  }
});
window.toggleQuickAdd=toggleQuickAdd;
window.quickAddOpen=quickAddOpen;

// ============================================================
// SCHOOL SETUP (Admin Resources)
// ============================================================

const ALL_SPORTS=['Football','Boys Basketball','Girls Basketball','Baseball','Softball','Soccer','Volleyball','Wrestling','Track','Cross Country','Golf','Tennis','Swimming','Cheer','Competitive Cheer','Bowling'];

async function renderSchoolSetup(){
  const school=currentUserData.school;
  const ref=db.collection('schoolSettings').doc(school);
  const snap=await ref.get();
  const data=snap.exists?snap.data():{};

  // Mascot
  document.getElementById('setup-mascot').value=data.mascot||SCHOOL_MASCOTS[school]||'';

  // Logo
  if(data.logoUrl){
    document.getElementById('setup-logo-preview').innerHTML=`<img src="${data.logoUrl}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  // Bell schedule
  const blocks=data.bellSchedule?.blocks||4;
  document.getElementById('setup-block-count').value=blocks;
  renderBlockBuilder(data.bellSchedule);

  // YouTube
  const ytStatus=document.getElementById('setup-youtube-status');
  if(school==='Carolina Forest High School'){
    document.getElementById('setup-youtube-channel').value='UCA5hSHjHTG4-WXe9uxXFZ2g';
    document.getElementById('setup-youtube-channel').disabled=true;
    ytStatus.innerHTML=`<div style="font-size:12px;color:#22c55e;">✓ Pre-configured: Panther Podcast (hardcoded for Carolina Forest)</div>`;
  }else if(data.youtubeChannelId){
    ytStatus.innerHTML=`<div style="font-size:12px;color:#22c55e;">✓ Connected channel: ${data.youtubeChannelId}</div>`;
    document.getElementById('setup-youtube-channel').value=data.youtubeChannelId;
  }else{
    ytStatus.innerHTML=`<div style="font-size:12px;color:var(--gray);">No channel connected yet.</div>`;
  }

  // Sports
  const selectedSports=data.sports||[];
  const sportsList=document.getElementById('setup-sports-list');
  sportsList.innerHTML=ALL_SPORTS.map(s=>`
    <label style="display:flex;align-items:center;gap:6px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;color:var(--white);">
      <input type="checkbox" value="${s}" class="setup-sport-cb" ${selectedSports.includes(s)?'checked':''}>
      ${s}
    </label>`).join('');

  // Pass limit
  document.getElementById('setup-pass-limit').value=data.passLimit||4;

  // Checklist
  renderSetupChecklist(data);
}

function renderSetupChecklist(data){
  const checklist=document.getElementById('setup-checklist');
  const items=[
    {label:'Mascot set', done:!!(data.mascot||SCHOOL_MASCOTS[currentUserData.school])},
    {label:'School logo uploaded', done:!!data.logoUrl},
    {label:'Bell schedule built', done:!!data.bellSchedule},
    {label:'YouTube channel connected', done:currentUserData.school==='Carolina Forest High School'||!!data.youtubeChannelId},
    {label:'Sports selected', done:!!(data.sports&&data.sports.length)},
    {label:'Hall pass limit set', done:!!data.passLimit},
  ];
  checklist.innerHTML=items.map(i=>`
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:${i.done?'#22c55e':'var(--gray)'};font-weight:700;">${i.done?'✓':'○'}</span>
      <span style="color:${i.done?'var(--white)':'var(--gray)'};">${i.label}</span>
    </div>`).join('');
}

async function saveMascot(){
  const mascot=document.getElementById('setup-mascot').value.trim();
  if(!mascot)return alert('Enter a mascot name.');
  await db.collection('schoolSettings').doc(currentUserData.school).set({mascot},{merge:true});
  alert('Mascot saved!');
  renderSchoolSetup();
}

async function uploadSchoolLogo(file){
  if(!file)return;
  try{
    const result=await uploadToCloudinary(file,'image');
    await db.collection('schoolSettings').doc(currentUserData.school).set({logoUrl:result.url},{merge:true});
    document.getElementById('setup-logo-preview').innerHTML=`<img src="${result.url}" style="width:100%;height:100%;object-fit:cover;">`;
    alert('Logo uploaded!');
    renderSchoolSetup();
  }catch(e){alert('Upload failed: '+e.message);}
}

function renderBlockBuilder(existing){
  const count=parseInt(document.getElementById('setup-block-count').value);
  const rows=document.getElementById('setup-bell-rows');
  const blocks=existing?.blockTimes||[];
  let html='';
  html+=`<div style="display:flex;gap:8px;align-items:center;">
    <span style="width:90px;font-size:13px;color:var(--white);font-weight:600;">Arrival</span>
    <input class="input bell-time-start" style="margin:0;flex:1;" type="time" value="${existing?.arrivalStart||'07:45'}" data-slot="arrival-start">
    <span style="color:var(--gray);">to</span>
    <input class="input bell-time-end" style="margin:0;flex:1;" type="time" value="${existing?.arrivalEnd||'08:20'}" data-slot="arrival-end">
  </div>`;
  for(let i=1;i<=count;i++){
    const b=blocks[i-1]||{};
    html+=`<div style="display:flex;gap:8px;align-items:center;">
      <span style="width:90px;font-size:13px;color:var(--white);font-weight:600;">Block ${i}</span>
      <input class="input" style="margin:0;flex:1;" type="time" value="${b.start||''}" data-block="${i}" data-slot="start">
      <span style="color:var(--gray);">to</span>
      <input class="input" style="margin:0;flex:1;" type="time" value="${b.end||''}" data-block="${i}" data-slot="end">
    </div>`;
    if(i===Math.ceil(count/2)){
      html+=`<div style="display:flex;gap:8px;align-items:center;">
        <span style="width:90px;font-size:13px;color:var(--white);font-weight:600;">Lunch</span>
        <input class="input" style="margin:0;flex:1;" type="time" value="${existing?.lunchStart||'11:34'}" data-slot="lunch-start">
        <span style="color:var(--gray);">to</span>
        <input class="input" style="margin:0;flex:1;" type="time" value="${existing?.lunchEnd||'12:08'}" data-slot="lunch-end">
      </div>`;
    }
  }
  html+=`<div style="display:flex;gap:8px;align-items:center;">
    <span style="width:90px;font-size:13px;color:var(--white);font-weight:600;">End of Day</span>
    <input class="input" style="margin:0;flex:1;" type="time" value="${existing?.endOfDay||'15:20'}" data-slot="end-of-day">
  </div>`;
  rows.innerHTML=html;
}

async function saveBellSchedule(){
  const count=parseInt(document.getElementById('setup-block-count').value);
  const arrivalStart=document.querySelector('[data-slot="arrival-start"]').value;
  const arrivalEnd=document.querySelector('[data-slot="arrival-end"]').value;
  const lunchStart=document.querySelector('[data-slot="lunch-start"]').value;
  const lunchEnd=document.querySelector('[data-slot="lunch-end"]').value;
  const endOfDay=document.querySelector('[data-slot="end-of-day"]').value;
  const blockTimes=[];
  for(let i=1;i<=count;i++){
    const start=document.querySelector(`[data-block="${i}"][data-slot="start"]`)?.value||'';
    const end=document.querySelector(`[data-block="${i}"][data-slot="end"]`)?.value||'';
    blockTimes.push({start,end});
  }
  await db.collection('schoolSettings').doc(currentUserData.school).set({
    bellSchedule:{blocks:count,arrivalStart,arrivalEnd,lunchStart,lunchEnd,endOfDay,blockTimes}
  },{merge:true});
  alert('Bell schedule saved!');
  renderSchoolSetup();
}

async function saveYoutubeChannel(){
  if(currentUserData.school==='Carolina Forest High School')return alert('This channel is pre-configured and cannot be changed.');
  let input=document.getElementById('setup-youtube-channel').value.trim();
  // Extract channel ID if a full URL was pasted
  let channelId=input;
  const channelMatch=input.match(/channel\/(UC[\w-]+)/);
  if(channelMatch)channelId=channelMatch[1];
  if(!channelId.startsWith('UC')){
    return alert('Please enter a valid Channel ID (starts with "UC") or a youtube.com/channel/ URL.');
  }
  await db.collection('schoolSettings').doc(currentUserData.school).set({youtubeChannelId:channelId},{merge:true});
  alert('YouTube channel connected!');
  renderSchoolSetup();
}

async function saveSports(){
  const checked=Array.from(document.querySelectorAll('.setup-sport-cb:checked')).map(cb=>cb.value);
  await db.collection('schoolSettings').doc(currentUserData.school).set({sports:checked},{merge:true});
  alert('Sports saved!');
  renderSchoolSetup();
}

async function savePassLimit(){
  const limit=parseInt(document.getElementById('setup-pass-limit').value);
  if(!limit||limit<1)return alert('Enter a valid limit.');
  await db.collection('schoolSettings').doc(currentUserData.school).set({passLimit:limit},{merge:true});
  alert('Hall pass limit saved!');
  renderSchoolSetup();
}

window.renderSchoolSetup=renderSchoolSetup;
window.saveMascot=saveMascot;
window.uploadSchoolLogo=uploadSchoolLogo;
window.renderBlockBuilder=renderBlockBuilder;
window.saveBellSchedule=saveBellSchedule;
window.saveYoutubeChannel=saveYoutubeChannel;
window.saveSports=saveSports;
window.savePassLimit=savePassLimit;

// ============================================================
// REPORTS PAGE
// ============================================================

async function renderReportsPage(){
  const isAdmin=currentUserData.isAdmin;
  const school=currentUserData.school;
  const uid=currentUser.uid;
  const q=isAdmin
    ?db.collection('classrooms').where('school','==',school)
    :db.collection('classrooms').where('school','==',school).where('teacherUid','==',uid);
  const snap=await q.get();
  const classes=snap.docs.map(d=>({id:d.id,...d.data()}));
  ['report-hp-class','report-att-class','report-grade-class'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML='<option value="">Select class...</option>'+classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  });
  // Populate students when hall pass class changes
  const hpClassEl=document.getElementById('report-hp-class');
  if(hpClassEl)hpClassEl.onchange=async function(){
    const classId=this.value;
    const studentEl=document.getElementById('report-hp-student');
    if(!classId){studentEl.innerHTML='<option value="">Select student...</option>';return;}
    const cls=classes.find(c=>c.id===classId);
    const userSnaps=await Promise.all((cls.students||[]).map(u=>db.collection('users').doc(u).get()));
    studentEl.innerHTML='<option value="">Select student...</option>'+userSnaps.filter(s=>s.exists).map(s=>`<option value="${s.id}">${s.data().name}</option>`).join('');
  };
}

async function exportHallPassReport(){
  const classId=document.getElementById('report-hp-class').value;
  const studentUid=document.getElementById('report-hp-student').value;
  if(!classId||!studentUid)return alert('Select a class and student.');
  const userDoc=await db.collection('users').doc(studentUid).get();
  const studentName=userDoc.exists?userDoc.data().name:'Unknown';
  const snap=await db.collection('hallpasses').where('classId','==',classId).where('uid','==',studentUid).get();
  const passes=snap.docs.map(d=>d.data()).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(16);doc.text('Hall Pass History Report',14,18);
  doc.setFontSize(11);doc.text(`Student: ${studentName}`,14,28);
  doc.text(`School: ${currentUserData.school}`,14,35);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`,14,42);
  let y=54;
  doc.setFontSize(10);doc.text('Date',14,y);doc.text('Destination',55,y);doc.text('Duration',105,y);doc.text('Status',145,y);
  y+=6;
  passes.forEach(p=>{
    if(y>280){doc.addPage();y=20;}
    const date=p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString():'—';
    doc.text(date,14,y);
    doc.text((p.destination||'—').slice(0,22),55,y);
    doc.text(`${p.duration||'—'} min`,105,y);
    doc.text(p.status||'—',145,y);
    y+=6;
  });
  if(!passes.length){doc.text('No hall pass history found.',14,y);}
  doc.save(`HallPassReport_${studentName.replace(/\s/g,'_')}.pdf`);
}

async function exportAttendanceReport(){
  const classId=document.getElementById('report-att-class').value;
  if(!classId)return alert('Select a class.');
  const classDoc=await db.collection('classrooms').doc(classId).get();
  const className=classDoc.exists?classDoc.data().name:'Class';
  const snap=await db.collection('studentAbsences').where('classId','==',classId).get();
  const records=snap.docs.map(d=>d.data()).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(16);doc.text('Attendance Summary Report',14,18);
  doc.setFontSize(11);doc.text(`Class: ${className}`,14,28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`,14,35);
  let y=48;
  doc.setFontSize(10);doc.text('Date',14,y);doc.text('Student',55,y);doc.text('Type',130,y);
  y+=6;
  for(const r of records){
    if(y>280){doc.addPage();y=20;}
    const userDoc=await db.collection('users').doc(r.uid).get();
    const name=userDoc.exists?userDoc.data().name:r.uid;
    doc.text(r.date,14,y);
    doc.text(name.slice(0,28),55,y);
    doc.text(r.type||'—',130,y);
    y+=6;
  }
  if(!records.length){doc.text('No attendance records found.',14,y);}
  doc.save(`AttendanceReport_${className.replace(/\s/g,'_')}.pdf`);
}

async function exportGradeReport(){
  const classId=document.getElementById('report-grade-class').value;
  if(!classId)return alert('Select a class.');
  const classDoc=await db.collection('classrooms').doc(classId).get();
  if(!classDoc.exists)return;
  const cls=classDoc.data();
  const assignments=cls.assignments||[];
  const userSnaps=await Promise.all((cls.students||[]).map(u=>db.collection('users').doc(u).get()));

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(16);doc.text('Grade Report',14,18);
  doc.setFontSize(11);doc.text(`Class: ${cls.name}`,14,28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`,14,35);
  let y=48;
  doc.setFontSize(10);doc.text('Student',14,y);doc.text('Average',150,y);
  y+=6;
  userSnaps.filter(s=>s.exists).forEach(s=>{
    if(y>280){doc.addPage();y=20;}
    const u=s.data();
    const grades=cls.grades?.[u.uid]||{};
    let total=0,weight=0;
    assignments.forEach(a=>{
      const g=grades[a.id];
      if(g!==undefined&&g!==null){total+=g*(a.weight||1);weight+=(a.weight||1);}
    });
    const avg=weight?(total/weight).toFixed(1):'—';
    doc.text(u.name.slice(0,40),14,y);
    doc.text(String(avg),150,y);
    y+=6;
  });
  doc.save(`GradeReport_${cls.name.replace(/\s/g,'_')}.pdf`);
}

window.renderReportsPage=renderReportsPage;
window.exportHallPassReport=exportHallPassReport;
window.exportAttendanceReport=exportAttendanceReport;
window.exportGradeReport=exportGradeReport;

// ============================================================
// IN-APP HELP GUIDE
// ============================================================

function renderHelpGuide(){
  const isAdmin=currentUserData.isAdmin;
  const content=document.getElementById('helpguide-content');
  content.innerHTML=`
    <div class="card">
      <div class="card-label">GETTING STARTED — CLASSROOMS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Create a classroom from the Classroom tab, then share the 6-character join code with your students.
        Students join from their own Classroom tab using "Join by Code."
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">POSTING ASSIGNMENTS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Open a classroom → Assignments tab → fill in name, category, weight, and an optional link, image, or video.
        Students see it instantly and can submit work directly from their grades view.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">ENTERING GRADES</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Open a classroom → Enter Grades tab → type each student's score per assignment. Grades update live for students.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">TAKING ATTENDANCE</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Open a classroom → Attendance tab. Each day starts fresh — mark Present, Absent, Tardy, or Excused.
        Only non-Present marks get logged to the student's absence record automatically.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">HALL PASSES</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Students request a pass from inside your classroom. You'll see Pending Requests in real time — approve or deny instantly.
        Use Verify Pass ID in Teacher Panel to confirm a student's pass and pull up their digital ID.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">VIDEO CALLS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Hit Start Call inside any classroom — no login needed for you or students. You can mute, kick, or end the call for everyone at any time.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">CLASS CHATS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Every classroom has a built-in Class Chat with you automatically included. Students can create sub-group chats for projects,
        but you're always added automatically and can delete any chat in your class.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">QUIZ GAME</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Build a quiz in your classroom — choose Live mode (real-time, Kahoot-style) or Practice mode (self-paced).
        Set a time window for when it's open, then archive and reuse it anytime.
      </p>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-label">REPORTS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Use the Reports tab under Teacher Resources to export hall pass history, attendance summaries, or grade reports as PDFs.
      </p>
    </div>
    ${isAdmin?`
    <div class="card" style="margin-top:14px;border:1px solid var(--gold);">
      <div class="card-label" style="color:var(--gold)">ADMIN — SCHOOL SETUP</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Visit School Setup under Admin Resources to configure your mascot, logo, bell schedule, YouTube news sync, sports list, and hall pass limits.
      </p>
    </div>
    <div class="card" style="margin-top:14px;border:1px solid var(--gold);">
      <div class="card-label" style="color:var(--gold)">ADMIN — GRANTING ROLES</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Use Admin Panel to grant Teacher or Admin access by email. Teachers can only be granted at your own school.
        Use Remove Admin/Teacher to revoke access — they'll need to sign out and back in.
      </p>
    </div>
    <div class="card" style="margin-top:14px;border:1px solid var(--gold);">
      <div class="card-label" style="color:var(--gold)">ADMIN — CLEANING UP ACCOUNTS</div>
      <p style="font-size:14px;color:var(--gray-light);line-height:1.6;">
        Use Remove from School in the Directory tab to remove duplicate or test accounts. The removed person is signed out automatically
        and can sign up again with the same email if needed.
      </p>
    </div>`:''}
  `;
}

function downloadTeacherGuide(){
  // Links to the guide hosted alongside the app (uploaded once to the GitHub repo)
  const link=document.createElement('a');
  link.href='ScholarSync-Teacher-Guide.docx';
  link.download='ScholarSync-Teacher-Guide.docx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.renderHelpGuide=renderHelpGuide;
window.downloadTeacherGuide=downloadTeacherGuide;

// ============================================================
// TODAY PAGE — Hall Pass Glance, Next Class
// ============================================================

function listenMyActivePassGlance(){
  if(window._myPassGlanceUnsub){window._myPassGlanceUnsub();}
  window._myPassGlanceUnsub=db.collection('hallpasses')
    .where('studentUid','==',currentUser.uid)
    .where('status','==','active')
    .onSnapshot(snap=>{
      const card=document.getElementById('today-pass-glance');
      const content=document.getElementById('today-pass-content');
      if(!card||!content)return;
      if(snap.empty){card.style.display='none';return;}
      const p=snap.docs[0].data();
      const elapsed=p.approvedAt?.toDate?Math.floor((Date.now()-p.approvedAt.toDate().getTime())/1000):0;
      const remaining=Math.max(0,(p.duration*60+(p.extraSeconds||0))-elapsed);
      const mm=Math.floor(remaining/60),ss=remaining%60;
      card.style.display='';
      content.innerHTML=`<div style="font-size:14px;color:var(--white);">${p.destination} — <span style="color:#22c55e;font-weight:700;">${mm}:${pad(ss)}</span> remaining</div>
        <button class="btn-ghost btn-sm" onclick="nav('classroom')" style="margin-top:6px;">View Pass</button>`;
    },err=>console.error('Pass glance:',err));
}

function updateNextClass(){
  const el=document.getElementById('today-next-class');
  if(!el)return;
  const now=new Date();
  const totalMins=now.getHours()*60+now.getMinutes();
  const saved=ls('ss_schedule')||{};
  let nextIdx=null;
  for(let i=0;i<PERIODS.length;i++){
    const p=PERIODS[i];
    const start=p.start[0]*60+p.start[1];
    if(start>totalMins){nextIdx=i;break;}
  }
  if(nextIdx===null){el.textContent='No more classes today';return;}
  const next=PERIODS[nextIdx];
  const start=next.start[0]*60+next.start[1];
  const minsUntil=start-totalMins;
  const className=saved['period'+nextIdx]||next.name;
  el.textContent=`${className} in ${minsUntil} min`;
}

// ============================================================
// DASHBOARD — Attendance %, Mini Calendar
// ============================================================

async function updateDashboardStats(){
  // Attendance %
  const snap=await db.collection('studentAbsences').where('uid','==',currentUser.uid).get();
  const totalDays=snap.size;
  const unexcused=snap.docs.filter(d=>d.data().type==='Unexcused').length;
  const attendanceEl=document.getElementById('stat-attendance');
  if(attendanceEl){
    // Rough estimate: assume ~180 school days, subtract absences
    const estimatedDays=180;
    const pct=totalDays?Math.max(0,Math.round(((estimatedDays-totalDays)/estimatedDays)*100)):100;
    attendanceEl.textContent=pct+'%';
  }

  // Mini calendar — this week's events
  const calEl=document.getElementById('dash-mini-calendar');
  if(calEl){
    const today=new Date();today.setHours(0,0,0,0);
    const weekEnd=new Date(today);weekEnd.setDate(weekEnd.getDate()+7);
    db.collection('calEvents').where('school','==',currentUserData.school).get().then(calSnap=>{
      const events=calSnap.docs.map(d=>d.data()).filter(e=>{
        const ed=new Date(e.date);
        return ed>=today&&ed<=weekEnd;
      }).sort((a,b)=>new Date(a.date)-new Date(b.date));
      calEl.innerHTML=events.length?events.map(e=>`
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <span>${e.title}</span>
          <span style="color:var(--gray);">${new Date(e.date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span>
        </div>`).join(''):'<div class="empty-state">No events this week</div>';
    }).catch(()=>{calEl.innerHTML='<div class="empty-state">No events this week</div>';});
  }
}

window.listenMyActivePassGlance=listenMyActivePassGlance;
window.updateNextClass=updateNextClass;
window.updateDashboardStats=updateDashboardStats;

// ============================================================
// FLASHCARDS — QUIZ MODE
// ============================================================

let quizQueue=[],quizIndex=0,quizCorrect=0,quizTotal=0;

function startQuizMode(){
  const cards=lsArr('ss_flashcards_'+currentUser.uid);
  const pool=currentDeck==='all'?cards:cards.filter(c=>c.deck===currentDeck);
  if(!pool.length)return alert('No flashcards to quiz! Add some first.');
  quizQueue=[...pool].sort(()=>Math.random()-0.5);
  quizIndex=0;quizCorrect=0;quizTotal=0;
  document.getElementById('fc-quiz-overlay').style.display='';
  showQuizCard();
}
function showQuizCard(){
  if(quizIndex>=quizQueue.length){
    const pct=quizTotal?Math.round((quizCorrect/quizTotal)*100):0;
    alert(`Quiz complete! You got ${quizCorrect}/${quizTotal} right (${pct}%).`);
    exitQuizMode();
    return;
  }
  const card=quizQueue[quizIndex];
  document.getElementById('quiz-progress').textContent=`${quizIndex+1}/${quizQueue.length}`;
  document.getElementById('quiz-question').textContent=card.front;
  document.getElementById('quiz-answer').textContent=card.back;
  document.getElementById('quiz-card').classList.remove('flipped');
  const pct=quizTotal?Math.round((quizCorrect/quizTotal)*100):null;
  document.getElementById('quiz-accuracy').textContent=pct!==null?pct+'%':'—';
}
function quizAnswer(correct){
  quizTotal++;
  if(correct)quizCorrect++;
  quizIndex++;
  showQuizCard();
}
function exitQuizMode(){
  document.getElementById('fc-quiz-overlay').style.display='none';
}

// ============================================================
// FLASHCARDS — SHARE / IMPORT DECK CODES
// ============================================================

function openShareDeckModal(){
  const cards=lsArr('ss_flashcards_'+currentUser.uid);
  const decks=[...new Set(cards.map(c=>c.deck))];
  if(!decks.length)return alert('No decks to share yet!');
  document.getElementById('share-deck-select').innerHTML=decks.map(d=>`<option value="${d}">${d}</option>`).join('');
  document.getElementById('share-deck-code-display').style.display='none';
  openModal('share-deck-modal');
}

function genDeckCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  for(let i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}

async function generateDeckShareCode(){
  const deckName=document.getElementById('share-deck-select').value;
  const cards=lsArr('ss_flashcards_'+currentUser.uid).filter(c=>c.deck===deckName);
  const code=genDeckCode();
  try{
    await db.collection('sharedDecks').doc(code).set({
      deckName,
      cards:cards.map(c=>({front:c.front,back:c.back})),
      sharedBy:currentUserData.name,
      createdAt:FS.serverTimestamp()
    });
    const display=document.getElementById('share-deck-code-display');
    display.style.display='';
    display.textContent=code;
  }catch(e){alert('Failed to generate code: '+e.message);}
}

async function importDeckByCode(){
  const code=document.getElementById('import-deck-input').value.trim().toUpperCase();
  if(code.length!==6)return alert('Enter a valid 6-character code.');
  try{
    const doc=await db.collection('sharedDecks').doc(code).get();
    if(!doc.exists)return alert('Deck code not found.');
    const data=doc.data();
    const cards=lsArr('ss_flashcards_'+currentUser.uid);
    let importDeckName=data.deckName;
    // Avoid overwriting an existing deck with the same name
    if(cards.some(c=>c.deck===importDeckName)){
      importDeckName=importDeckName+' (Imported)';
    }
    data.cards.forEach(c=>{
      cards.push({id:genId(),deck:importDeckName,front:c.front,back:c.back});
    });
    ls('ss_flashcards_'+currentUser.uid,cards);
    closeAllModals();
    document.getElementById('import-deck-input').value='';
    alert(`Imported "${importDeckName}" with ${data.cards.length} cards!`);
    renderFlashcards();
  }catch(e){alert('Import failed: '+e.message);}
}

window.startQuizMode=startQuizMode;
window.quizAnswer=quizAnswer;
window.exitQuizMode=exitQuizMode;
window.openShareDeckModal=openShareDeckModal;
window.generateDeckShareCode=generateDeckShareCode;
window.importDeckByCode=importDeckByCode;

window.toggleEventRSVP=toggleEventRSVP;
window.viewRSVPList=viewRSVPList;

window.togglePinAnnouncement=togglePinAnnouncement;

// ============================================================
// CLASS ANNOUNCEMENTS (per-classroom)
// ============================================================

function renderClassAnnouncements(){
  if(!currentClass)return;
  const isTeacherOfThisClass=currentUserData.isTeacher&&currentClass.teacherUid===currentUser.uid;
  const postBtn=document.querySelector('#cd-announcements-tab .btn-blue');
  if(postBtn)postBtn.style.display=(isTeacherOfThisClass||currentUserData.isAdmin)?'':'none';
  if(window._classAnnUnsub)window._classAnnUnsub();
  window._classAnnUnsub=db.collection('classAnnouncements')
    .where('classId','==',currentClass.id)
    .onSnapshot(snap=>{
      const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
      document.getElementById('cd-announcements-list').innerHTML=items.length?items.map(a=>`
        <div class="ann-card">
          <div class="ann-title">${a.title}</div>
          <div class="ann-body">${a.body}</div>
          <div class="ann-meta"><span>${a.postedByName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Just now'}</span>${(isTeacherOfThisClass||currentUserData.isAdmin)?`<button class="btn-ghost btn-sm" onclick="deleteClassAnnouncement('${a.id}')">Delete</button>`:''}</div>
        </div>`).join(''):'<div class="empty-state">No class announcements yet</div>';
    },err=>console.error('Class announcements error:',err));
  unsubscribers.push(window._classAnnUnsub);
}

async function postClassAnnouncement(){
  if(!currentClass)return;
  const title=document.getElementById('class-ann-title').value.trim();
  const body=document.getElementById('class-ann-body').value.trim();
  if(!title||!body)return alert('Please fill in title and body.');
  await db.collection('classAnnouncements').add({
    title,body,classId:currentClass.id,
    postedBy:currentUser.uid,postedByName:currentUserData.name,
    createdAt:FS.serverTimestamp()
  });
  closeAllModals();
  document.getElementById('class-ann-title').value='';
  document.getElementById('class-ann-body').value='';
}

async function deleteClassAnnouncement(id){
  await db.collection('classAnnouncements').doc(id).delete();
}

window.renderClassAnnouncements=renderClassAnnouncements;
window.postClassAnnouncement=postClassAnnouncement;
window.deleteClassAnnouncement=deleteClassAnnouncement;

// ============================================================
// CLASSROOM QUIZ GAME (Live + Practice modes)
// ============================================================

let quizBuilderQuestions=[];

function addQuizQuestionField(){
  const id=genId();
  quizBuilderQuestions.push({id,question:'',options:['','','',''],correctIndex:0});
  renderQuizBuilderFields();
}
function renderQuizBuilderFields(){
  const container=document.getElementById('quiz-questions-builder');
  if(!container)return;
  container.innerHTML=quizBuilderQuestions.map((q,i)=>`
    <div class="card" style="margin-bottom:10px;">
      <input class="input" placeholder="Question ${i+1}..." value="${q.question}" oninput="updateQuizQ(${i},'question',this.value)">
      ${q.options.map((opt,j)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <input type="radio" name="correct-${q.id}" ${q.correctIndex===j?'checked':''} onchange="updateQuizQ(${i},'correctIndex',${j})">
          <input class="input" style="margin:0;flex:1;" placeholder="Option ${j+1}..." value="${opt}" oninput="updateQuizOption(${i},${j},this.value)">
        </div>`).join('')}
      <button class="btn-ghost btn-sm" onclick="removeQuizQ(${i})">Remove Question</button>
    </div>`).join('');
}
function updateQuizQ(i,field,val){quizBuilderQuestions[i][field]=val;}
function updateQuizOption(i,j,val){quizBuilderQuestions[i].options[j]=val;}
function removeQuizQ(i){quizBuilderQuestions.splice(i,1);renderQuizBuilderFields();}

async function saveQuiz(){
  if(!currentClass)return;
  const title=document.getElementById('quiz-title').value.trim();
  const mode=document.getElementById('quiz-mode-select').value;
  const openTime=document.getElementById('quiz-open-time').value;
  const closeTime=document.getElementById('quiz-close-time').value;
  if(!title)return alert('Enter a quiz title.');
  if(!quizBuilderQuestions.length)return alert('Add at least one question.');
  const validQuestions=quizBuilderQuestions.filter(q=>q.question.trim()&&q.options.every(o=>o.trim()));
  if(!validQuestions.length)return alert('Fill in all questions and options.');
  await db.collection('classQuizzes').add({
    title,mode,openTime,closeTime,
    classId:currentClass.id,
    questions:validQuestions,
    archived:false,
    createdBy:currentUser.uid,
    createdByName:currentUserData.name,
    createdAt:FS.serverTimestamp()
  });
  quizBuilderQuestions=[];
  closeAllModals();
  document.getElementById('quiz-title').value='';
  renderClassQuizzes();
}

function renderClassQuizzes(){
  if(!currentClass)return;
  const isTeacherOfThisClass=currentUserData.isTeacher&&currentClass.teacherUid===currentUser.uid;
  const buildBtn=document.querySelector('#cd-quiz-tab .btn-blue');
  if(buildBtn)buildBtn.style.display=(isTeacherOfThisClass||currentUserData.isAdmin)?'':'none';
  if(window._classQuizUnsub)window._classQuizUnsub();
  window._classQuizUnsub=db.collection('classQuizzes')
    .where('classId','==',currentClass.id)
    .onSnapshot(snap=>{
      const items=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
      const now=new Date();
      document.getElementById('cd-quiz-list').innerHTML=items.length?items.map(q=>{
        const isOpen=(!q.openTime||new Date(q.openTime)<=now)&&(!q.closeTime||new Date(q.closeTime)>=now);
        const statusLabel=q.archived?'Archived':isOpen?'Open':'Closed';
        const statusColor=q.archived?'var(--gray)':isOpen?'#22c55e':'#ef4444';
        return `<div class="card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--white);">${q.title}</div>
              <div style="font-size:11px;color:var(--gray);">${q.mode==='live'?'Live Mode':'Practice Mode'} • ${q.questions.length} questions • <span style="color:${statusColor};">${statusLabel}</span></div>
            </div>
            <div style="display:flex;gap:6px;">
              ${(isOpen||q.mode==='practice')&&!q.archived?`<button class="btn-blue btn-sm" onclick="playQuiz('${q.id}')">Play</button>`:''}
              ${(isTeacherOfThisClass||currentUserData.isAdmin)?`<button class="btn-ghost btn-sm" onclick="toggleArchiveQuiz('${q.id}',${!q.archived})">${q.archived?'Repost':'Archive'}</button>`:''}
            </div>
          </div>
        </div>`;
      }).join(''):'<div class="empty-state">No quizzes yet</div>';
    },err=>console.error('Class quizzes error:',err));
  unsubscribers.push(window._classQuizUnsub);
}

async function toggleArchiveQuiz(id,archived){
  await db.collection('classQuizzes').doc(id).update({archived});
}

let activeQuizPlay=null,activeQuizIndex=0,activeQuizScore=0;
async function playQuiz(quizId){
  const doc=await db.collection('classQuizzes').doc(quizId).get();
  if(!doc.exists)return;
  activeQuizPlay={id:doc.id,...doc.data()};
  activeQuizIndex=0;activeQuizScore=0;
  document.getElementById('cd-quiz-play-area').style.display='';
  showQuizPlayQuestion();
}
function showQuizPlayQuestion(){
  const area=document.getElementById('cd-quiz-play-area');
  if(activeQuizIndex>=activeQuizPlay.questions.length){
    const pct=Math.round((activeQuizScore/activeQuizPlay.questions.length)*100);
    area.innerHTML=`<div class="card"><div class="card-label">QUIZ COMPLETE</div><div style="font-size:24px;font-weight:700;color:var(--white);margin:10px 0;">${activeQuizScore}/${activeQuizPlay.questions.length} (${pct}%)</div><button class="btn-ghost" onclick="closeQuizPlay()">Close</button></div>`;
    return;
  }
  const q=activeQuizPlay.questions[activeQuizIndex];
  area.innerHTML=`<div class="card">
    <div class="card-label">QUESTION ${activeQuizIndex+1}/${activeQuizPlay.questions.length}</div>
    <div style="font-size:16px;font-weight:600;color:var(--white);margin:10px 0;">${q.question}</div>
    ${q.options.map((opt,i)=>`<button class="btn-ghost" style="display:block;width:100%;text-align:left;margin-bottom:8px;" onclick="answerQuizPlay(${i})">${opt}</button>`).join('')}
  </div>`;
}
function answerQuizPlay(selectedIndex){
  const q=activeQuizPlay.questions[activeQuizIndex];
  if(selectedIndex===q.correctIndex)activeQuizScore++;
  activeQuizIndex++;
  showQuizPlayQuestion();
}
function closeQuizPlay(){
  document.getElementById('cd-quiz-play-area').style.display='none';
  document.getElementById('cd-quiz-play-area').innerHTML='';
  activeQuizPlay=null;
}

window.addQuizQuestionField=addQuizQuestionField;
window.updateQuizQ=updateQuizQ;
window.updateQuizOption=updateQuizOption;
window.removeQuizQ=removeQuizQ;
window.saveQuiz=saveQuiz;
window.renderClassQuizzes=renderClassQuizzes;
window.toggleArchiveQuiz=toggleArchiveQuiz;
window.playQuiz=playQuiz;
window.answerQuizPlay=answerQuizPlay;
window.closeQuizPlay=closeQuizPlay;

// Populate the "select class" dropdown for sub-group chat creation with actual joined classrooms
async function populateChatClassDropdown(){
  const el=document.getElementById('new-chat-class');
  if(!el)return;
  const isStaff=currentUserData.isTeacher||currentUserData.isAdmin;
  const q=isStaff
    ?db.collection('classrooms').where('school','==',currentUserData.school).where('teacherUid','==',currentUser.uid)
    :db.collection('classrooms').where('school','==',currentUserData.school).where('students','array-contains',currentUser.uid);
  const snap=await q.get();
  const classes=snap.docs.map(d=>({id:d.id,...d.data()}));
  el.innerHTML='<option value="">Select class...</option>'+classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}
window.populateChatClassDropdown=populateChatClassDropdown;

async function saveBracket(){
  const sport=document.getElementById('bracket-sport').value.trim();
  const jsonText=document.getElementById('bracket-json').value.trim();
  if(!sport||!jsonText)return alert('Fill in sport and bracket data.');
  let rounds;
  try{rounds=JSON.parse(jsonText);}
  catch(e){return alert('Invalid JSON format. Please check your bracket data.');}
  await db.collection('sportsBrackets').doc(currentUserData.school).set({sport,rounds,updatedAt:FS.serverTimestamp()});
  closeAllModals();
  alert('Bracket updated!');
  renderBracket();
}
window.saveBracket=saveBracket;

function switchNewsTab(tab,el){
  document.querySelectorAll('#page-newspaper .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('newspaper-videos-tab').style.display=tab==='videos'?'':'none';
  document.getElementById('newspaper-articles-tab').style.display=tab==='articles'?'':'none';
}
window.switchNewsTab=switchNewsTab;

// Ensure every student has a parent link code, even accounts created before this feature shipped
async function ensureParentLinkCode(){
  if(!currentUserData||currentUserData.isTeacher||currentUserData.isAdmin)return;
  const codeEl=document.getElementById('profile-parent-code');
  if(!currentUserData.parentLinkCode){
    const code=genParentLinkCode();
    await db.collection('users').doc(currentUser.uid).update({parentLinkCode:code});
    currentUserData.parentLinkCode=code;
  }
  if(codeEl)codeEl.textContent=currentUserData.parentLinkCode;
}
window.ensureParentLinkCode=ensureParentLinkCode;

// ============================================================
// ADMIN — PARENT LINK CODE SEARCH
// ============================================================

let parentCodeSearchTimeout=null;
function searchParentCodes(){
  clearTimeout(parentCodeSearchTimeout);
  parentCodeSearchTimeout=setTimeout(async()=>{
    const q=document.getElementById('admin-parent-code-search').value.trim().toLowerCase();
    const resultsEl=document.getElementById('admin-parent-code-results');
    if(!q){resultsEl.innerHTML='';return;}
    const snap=await db.collection('users').where('school','==',currentUserData.school).get();
    const matches=snap.docs.map(d=>d.data()).filter(u=>!u.isTeacher&&!u.isAdmin&&u.name.toLowerCase().includes(q));
    resultsEl.innerHTML=matches.length?matches.map(u=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13px;color:var(--white);font-weight:600;">${u.name}</div>
          <div style="font-size:11px;color:var(--gray);">${u.grade||'—'} • ${u.email}</div>
        </div>
        <div style="font-size:14px;font-family:monospace;font-weight:700;color:#22c55e;">${u.parentLinkCode||'No code yet'}</div>
      </div>`).join(''):'<div class="empty-state">No students found</div>';
  },300);
}
window.searchParentCodes=searchParentCodes;

// ============================================================
// PARENT PORTAL
// ============================================================

let currentParentStudent=null;

function launchParentPortal(){
  document.getElementById('parent-name-display').textContent=currentParentData.name;
  renderLinkedStudents();
}

async function linkStudentByCode(){
  const code=document.getElementById('parent-link-code-input').value.trim().toUpperCase();
  if(code.length!==8)return alert('Enter a valid 8-character code.');
  const snap=await db.collection('users').where('parentLinkCode','==',code).get();
  if(snap.empty)return alert('Code not found. Double-check with your child or the school admin.');
  const student=snap.docs[0].data();
  const linked=currentParentData.linkedStudents||[];
  if(linked.some(s=>s.studentUid===student.uid))return alert(`${student.name} is already linked to your account.`);
  const newLink={studentUid:student.uid,studentName:student.name,school:student.school};
  await db.collection('parents').doc(currentUser.uid).update({
    linkedStudents:FS.arrayUnion(newLink)
  });
  currentParentData.linkedStudents=[...linked,newLink];
  document.getElementById('parent-link-code-input').value='';
  alert(`${student.name} has been linked to your account!`);
  renderLinkedStudents();
}

function renderLinkedStudents(){
  const linked=currentParentData.linkedStudents||[];
  const el=document.getElementById('parent-linked-students');
  el.innerHTML=linked.length?`<div class="card-label" style="margin-bottom:8px;">YOUR LINKED STUDENTS</div>`+linked.map(s=>`
    <div class="card" style="cursor:pointer;margin-bottom:10px;" onclick="openParentStudentDetail('${s.studentUid}','${s.studentName.replace(/'/g,"\\'")}','${s.school.replace(/'/g,"\\'")}')">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--white);">${s.studentName}</div>
          <div style="font-size:12px;color:var(--gray);">${s.school}</div>
        </div>
        <button class="btn-ghost btn-sm" onclick="event.stopPropagation();unlinkStudent('${s.studentUid}')">Unlink</button>
      </div>
    </div>`).join(''):'<div class="empty-state">No students linked yet. Enter a code above to get started.</div>';
}

async function unlinkStudent(studentUid){
  if(!confirm('Unlink this student from your account?'))return;
  const linked=(currentParentData.linkedStudents||[]).filter(s=>s.studentUid!==studentUid);
  await db.collection('parents').doc(currentUser.uid).update({linkedStudents:linked});
  currentParentData.linkedStudents=linked;
  renderLinkedStudents();
}

function openParentStudentDetail(studentUid,studentName,school){
  currentParentStudent={uid:studentUid,name:studentName,school};
  document.getElementById('parent-detail-name').textContent=studentName;
  document.getElementById('parent-detail-school').textContent=school;
  document.getElementById('parent-linked-students').style.display='none';
  document.getElementById('parent-link-code-card').style.display='none';
  document.getElementById('parent-student-detail').style.display='';
  renderParentGrades();
}

function closeParentStudentDetail(){
  currentParentStudent=null;
  document.getElementById('parent-linked-students').style.display='';
  document.getElementById('parent-link-code-card').style.display='';
  document.getElementById('parent-student-detail').style.display='none';
}

function switchParentTab(tab,el){
  document.querySelectorAll('#parent-student-detail .tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  ['grades','attendance','announcements','passes','deadlines'].forEach(t=>{
    document.getElementById('parent-'+t+'-tab').style.display=t===tab?'':'none';
  });
  if(tab==='grades')renderParentGrades();
  if(tab==='attendance')renderParentAttendance();
  if(tab==='announcements')renderParentAnnouncements();
  if(tab==='passes')renderParentPasses();
  if(tab==='deadlines')renderParentDeadlines();
}

async function renderParentGrades(){
  const el=document.getElementById('parent-grades-tab');
  el.innerHTML='<div class="empty-state">Loading grades...</div>';
  const snap=await db.collection('classrooms').where('school','==',currentParentStudent.school).where('students','array-contains',currentParentStudent.uid).get();
  const classes=snap.docs.map(d=>d.data());
  if(!classes.length){el.innerHTML='<div class="empty-state">No classes found.</div>';return;}
  el.innerHTML=classes.map(c=>{
    const assignments=c.assignments||[];
    const grades=c.grades||{};
    const myGrades=assignments.map(a=>({...a,grade:(grades[a.id]||{})[currentParentStudent.uid]}));
    const scored=myGrades.filter(a=>a.grade!==undefined&&a.grade!==null);
    const avg=scored.length?Math.round(scored.reduce((s,a)=>s+(a.grade*(a.weight/100)),0)/scored.reduce((s,a)=>s+a.weight/100,0)):null;
    return `<div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:15px;font-weight:700;color:var(--white);">${c.name}</div>
        <div style="font-size:18px;font-weight:700;color:${avg>=90?'#22c55e':avg>=70?'#3b82f6':avg!==null?'#ef4444':'var(--gray)'};">${avg!==null?avg+'%':'—'}</div>
      </div>
      <div style="font-size:12px;color:var(--gray);margin-top:4px;">${c.teacherName} • ${c.subject}</div>
    </div>`;
  }).join('');
}

async function renderParentAttendance(){
  const el=document.getElementById('parent-attendance-tab');
  el.innerHTML='<div class="empty-state">Loading attendance...</div>';
  const snap=await db.collection('studentAbsences').where('uid','==',currentParentStudent.uid).get();
  const records=snap.docs.map(d=>d.data()).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!records.length){el.innerHTML='<div class="empty-state">No absences on record.</div>';return;}
  el.innerHTML=records.map(r=>`
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span>${r.date} — ${r.cls}</span>
      <span style="color:${r.type==='Unexcused'?'#ef4444':r.type==='Tardy'?'#f59e0b':'#22c55e'};font-weight:600;">${r.type}</span>
    </div>`).join('');
}

async function renderParentAnnouncements(){
  const el=document.getElementById('parent-announcements-tab');
  el.innerHTML='<div class="empty-state">Loading announcements...</div>';
  const snap=await db.collection('announcements').where('school','==',currentParentStudent.school).get();
  const items=snap.docs.map(d=>d.data()).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,15);
  el.innerHTML=items.length?items.map(a=>`
    <div class="card" style="margin-bottom:10px;">
      <div style="font-size:14px;font-weight:700;color:var(--white);">${a.title}</div>
      <div style="font-size:13px;color:var(--gray-light);margin-top:4px;">${a.body}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px;">${a.postedByName} • ${a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString():'Recently'}</div>
    </div>`).join(''):'<div class="empty-state">No announcements yet.</div>';
}

async function renderParentPasses(){
  const el=document.getElementById('parent-passes-tab');
  el.innerHTML='<div class="empty-state">Loading hall passes...</div>';
  const snap=await db.collection('hallpasses').where('studentUid','==',currentParentStudent.uid).get();
  const passes=snap.docs.map(d=>d.data()).sort((a,b)=>(b.requestedAt?.toMillis?.()||0)-(a.requestedAt?.toMillis?.()||0)).slice(0,20);
  el.innerHTML=passes.length?passes.map(p=>`
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span>${p.destination} • ${p.duration} min</span>
      <span style="color:var(--gray);">${p.requestedAt?.toDate?p.requestedAt.toDate().toLocaleDateString():'—'} — ${p.status}</span>
    </div>`).join(''):'<div class="empty-state">No hall pass history.</div>';
}

async function renderParentDeadlines(){
  const el=document.getElementById('parent-deadlines-tab');
  el.innerHTML='<div class="empty-state">Loading deadlines...</div>';
  const snap=await db.collection('classrooms').where('school','==',currentParentStudent.school).where('students','array-contains',currentParentStudent.uid).get();
  const deadlines=[];
  snap.docs.forEach(d=>{
    const cls=d.data();
    (cls.assignments||[]).forEach(a=>{
      if(a.due)deadlines.push({name:a.name,cls:cls.name,due:a.due});
    });
  });
  deadlines.sort((a,b)=>new Date(a.due)-new Date(b.due));
  const upcoming=deadlines.filter(d=>daysDiff(d.due)>=0);
  el.innerHTML=upcoming.length?upcoming.map(d=>`
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span>${d.name} (${d.cls})</span>
      <span style="color:${daysDiff(d.due)<=1?'#ef4444':'var(--gray)'};font-weight:600;">${d.due}</span>
    </div>`).join(''):'<div class="empty-state">No upcoming deadlines.</div>';
}

window.launchParentPortal=launchParentPortal;
window.linkStudentByCode=linkStudentByCode;
window.unlinkStudent=unlinkStudent;
window.openParentStudentDetail=openParentStudentDetail;
window.closeParentStudentDetail=closeParentStudentDetail;
window.switchParentTab=switchParentTab;
