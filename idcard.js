// ScholarSync — Student ID upgrade (load AFTER main.js)
// - School-picture style ID photo (crop + upload via Cloudinary)
// - QR code now encodes a short link, not a block of text
// - Scanning opens a verify page showing photo, name, grade, student ID (staff only)
(function(){
'use strict';

const BASE = location.origin + location.pathname.replace(/index\.html$/, '');
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function splitName(full){
  const p = (full || '').trim().split(/\s+/);
  return { first: p[0] || '', last: p.slice(1).join(' ') };
}
function newToken(){
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- STYLES ----------
const style = document.createElement('style');
style.textContent = `
  .id-card-header{align-items:flex-start !important;}
  .id-card-header > div:nth-child(2){flex:1;min-width:0;}
  .id-avatar{width:84px !important;height:112px !important;border-radius:10px !important;
    background-size:cover;background-position:center;font-size:12px !important;
    text-align:center;line-height:1.3;flex-shrink:0;}
  #id-scan-overlay{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.88);
    display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
  #id-scan-card{background:#0f1724;border:1px solid #1e2d45;border-radius:18px;padding:24px;
    width:100%;max-width:340px;text-align:center;color:#f0f4ff;font-family:Inter,sans-serif;}
`;
document.head.appendChild(style);

// ---------- SYNC PUBLIC-SAFE ID RECORD ----------
// Only the fields shown on the scan page are copied into idCards/{token}.
async function syncIdCard(){
  const u = currentUserData;
  if(!u || !currentUser) return null;
  let token = u.idToken;
  if(!token){
    token = newToken();
    await db.collection('users').doc(currentUser.uid).update({ idToken: token });
    currentUserData.idToken = token;
  }
  const n = splitName(u.name);
  await db.collection('idCards').doc(token).set({
    uid: currentUser.uid,
    firstName: n.first,
    lastName: n.last,
    studentId: u.studentIdNumber || '',
    grade: u.grade || '',
    school: u.school || '',
    photoUrl: u.idPhotoURL || '',
    updatedAt: FS.serverTimestamp()
  });
  return token;
}

// ---------- RENDER ID CARD ----------
window.renderID = function(){
  const u = currentUserData;
  if(!u) return;

  // one-time migration of an ID number saved in the old localStorage format
  const legacy = ls('ss_idCard') || {};
  if(!u.studentIdNumber && legacy.idNumber){
    u.studentIdNumber = legacy.idNumber;
    db.collection('users').doc(currentUser.uid).update({ studentIdNumber: legacy.idNumber }).catch(()=>{});
  }

  el('id-name').textContent = u.name;
  el('id-school-label').textContent = u.school;
  el('id-grade-display').textContent = u.grade || '—';
  el('id-num-display').textContent = u.studentIdNumber || '—';
  el('id-num-input').value = u.studentIdNumber || '';

  const gradeInput = el('id-grade-input');
  if(gradeInput) gradeInput.style.display = 'none';   // grade comes from signup now
  const barcode = el('id-barcode');
  if(barcode) barcode.style.display = 'none';          // the old barcode was decorative only

  const av = el('id-avatar');
  if(u.idPhotoURL){
    av.style.backgroundImage = `url(${u.idPhotoURL})`;
    av.textContent = '';
  }else{
    av.style.backgroundImage = '';
    av.textContent = 'Add ID photo below';
  }

  const wrap = el('id-qr-wrap');
  wrap.innerHTML = '';
  syncIdCard().then(token => {
    if(!token) return;
    wrap.innerHTML = '';
    if(!window.QRCode){
      wrap.innerHTML = '<div style="color:#b91c1c;font-size:12px;">QR library did not load. Refresh the page.</div>';
      return;
    }
    new QRCode(wrap, {
      text: BASE + '?id=' + token,
      width: 140, height: 140,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }).catch(e => {
    console.error('ID card sync failed:', e);
    wrap.innerHTML = '<div style="color:#b91c1c;font-size:12px;max-width:200px;">Could not create QR: ' + esc(e.message) + '</div>';
  });
};

window.saveID = async function(){
  const num = el('id-num-input').value.trim();
  if(!/^[A-Za-z0-9-]{3,20}$/.test(num)) return alert('Enter your student ID number (letters, numbers, dashes only).');
  try{
    await db.collection('users').doc(currentUser.uid).update({ studentIdNumber: num });
    currentUserData.studentIdNumber = num;
    window.renderID();
    alert('ID saved!');
  }catch(e){ alert('Could not save: ' + e.message); }
};

// ---------- PHOTO EDITOR ----------
let photoImg = null;

function injectPhotoUI(){
  const page = el('page-idcard');
  if(!page || el('id-photo-card')) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'id-photo-card';
  card.style.marginTop = '16px';
  card.innerHTML = `
    <div class="card-label">ID PHOTO</div>
    <p style="font-size:12px;color:var(--gray);margin-bottom:10px;line-height:1.5;">
      Use a school-picture style photo: face centered, shoulders up, looking at the camera,
      plain background, good lighting. No sunglasses, hats or filters.
    </p>
    <input type="file" id="id-photo-file" accept="image/*" style="display:none;">
    <button class="btn-ghost" id="id-photo-choose">Choose or Take Photo</button>
    <div id="id-photo-editor" style="display:none;">
      <canvas id="id-photo-canvas" width="300" height="400"
        style="width:240px;height:320px;border-radius:10px;display:block;margin:14px auto;background:#111;"></canvas>
      <div style="font-size:12px;color:var(--gray);margin-bottom:4px;">Zoom</div>
      <input type="range" id="id-photo-zoom" min="1" max="3" step="0.01" value="1" style="width:100%;">
      <div style="font-size:12px;color:var(--gray);margin:8px 0 4px;">Move left / right</div>
      <input type="range" id="id-photo-x" min="-1" max="1" step="0.01" value="0" style="width:100%;">
      <div style="font-size:12px;color:var(--gray);margin:8px 0 4px;">Move up / down</div>
      <input type="range" id="id-photo-y" min="-1" max="1" step="0.01" value="0" style="width:100%;">
      <p style="font-size:11px;color:var(--gray);margin:8px 0;">Line your face up inside the dashed oval. The oval is only a guide and will not appear on your ID.</p>
      <button class="btn-blue" id="id-photo-save" style="width:100%;">Save as ID Photo</button>
    </div>`;
  page.appendChild(card);

  el('id-photo-choose').onclick = () => el('id-photo-file').click();
  el('id-photo-file').onchange = onPhotoChosen;
  ['id-photo-zoom','id-photo-x','id-photo-y'].forEach(id => el(id).oninput = redrawPreview);
  el('id-photo-save').onclick = savePhoto;
}

function onPhotoChosen(){
  const file = this.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')) return alert('Please choose an image file.');
  if(file.size > 15 * 1024 * 1024) return alert('Photo must be under 15MB.');
  const img = new Image();
  img.onload = () => {
    photoImg = img;
    el('id-photo-zoom').value = 1;
    el('id-photo-x').value = 0;
    el('id-photo-y').value = 0;
    el('id-photo-editor').style.display = '';
    redrawPreview();
  };
  img.onerror = () => alert('Could not read that image. Try a different photo.');
  img.src = URL.createObjectURL(file);
  this.value = '';
}

function drawPhoto(ctx, w, h, guide){
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  if(!photoImg) return;
  const zoom = parseFloat(el('id-photo-zoom').value);
  const px = parseFloat(el('id-photo-x').value);
  const py = parseFloat(el('id-photo-y').value);
  const base = Math.max(w / photoImg.naturalWidth, h / photoImg.naturalHeight);
  const s = base * zoom;
  const dw = photoImg.naturalWidth * s, dh = photoImg.naturalHeight * s;
  const dx = (w - dw) / 2 + px * (dw - w) / 2;
  const dy = (h - dh) / 2 + py * (dh - h) / 2;
  ctx.drawImage(photoImg, dx, dy, dw, dh);
  if(guide){
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.42, w * 0.28, h * 0.26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function redrawPreview(){
  const c = el('id-photo-canvas');
  if(c) drawPhoto(c.getContext('2d'), c.width, c.height, true);
}

async function savePhoto(){
  const btn = el('id-photo-save');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  try{
    const c = document.createElement('canvas');
    c.width = 600; c.height = 800;
    drawPhoto(c.getContext('2d'), 600, 800, false);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
    if(!blob) throw new Error('Could not process the photo.');
    const file = new File([blob], 'id-photo.jpg', { type: 'image/jpeg' });
    const res = await uploadToCloudinary(file, 'image');
    await db.collection('users').doc(currentUser.uid).update({ idPhotoURL: res.url });
    currentUserData.idPhotoURL = res.url;
    el('id-photo-editor').style.display = 'none';
    photoImg = null;
    window.renderID();
    alert('ID photo saved!');
  }catch(e){
    alert('Could not save photo: ' + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = 'Save as ID Photo';
  }
}

// ---------- SCAN / VERIFY PAGE ----------
function closeScan(){
  const o = el('id-scan-overlay');
  if(o) o.remove();
  history.replaceState(null, '', location.pathname);
}
window.closeIdScan = closeScan;

function showScan(html){
  let o = el('id-scan-overlay');
  if(!o){
    o = document.createElement('div');
    o.id = 'id-scan-overlay';
    document.body.appendChild(o);
  }
  o.innerHTML = `<div id="id-scan-card">${html}
    <button class="btn-ghost" style="margin-top:16px;width:100%;" onclick="closeIdScan()">Close</button></div>`;
}

async function checkIdScan(){
  const token = new URLSearchParams(location.search).get('id');
  if(!token) return;
  showScan('<div style="color:#8097b8;padding:20px 0;">Checking ID...</div>');
  const u = currentUserData;
  if(!(u && (u.isTeacher || u.isAdmin))){
    showScan('<div style="font-size:16px;font-weight:700;margin-bottom:8px;">Staff only</div>' +
      '<div style="font-size:13px;color:#8097b8;">Only teachers and admins can verify student IDs. Sign in with a staff account and scan again.</div>');
    return;
  }
  try{
    const snap = await db.collection('idCards').doc(token).get();
    if(!snap.exists){
      showScan('<div style="font-size:18px;font-weight:700;color:#ef4444;margin-bottom:8px;">ID NOT FOUND</div>' +
        '<div style="font-size:13px;color:#8097b8;">This QR code is not linked to any ScholarSync student.</div>');
      return;
    }
    const d = snap.data();
    if(d.school !== u.school){
      showScan('<div style="font-size:18px;font-weight:700;color:#f59e0b;margin-bottom:8px;">DIFFERENT SCHOOL</div>' +
        '<div style="font-size:13px;color:#8097b8;">This student is not enrolled at your school.</div>');
      return;
    }
    const photo = d.photoUrl
      ? `<div style="width:180px;height:240px;margin:0 auto 14px;border-radius:12px;background:url(${esc(d.photoUrl)}) center/cover;"></div>`
      : '<div style="width:180px;height:240px;margin:0 auto 14px;border-radius:12px;background:#1a2540;display:flex;align-items:center;justify-content:center;color:#8097b8;font-size:13px;">No photo on file</div>';
    showScan(`
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#22c55e;margin-bottom:12px;">VERIFIED SCHOLARSYNC ID</div>
      ${photo}
      <div style="font-size:26px;font-weight:700;line-height:1.1;">${esc(d.firstName)}</div>
      <div style="font-size:26px;font-weight:700;line-height:1.1;margin-bottom:14px;">${esc(d.lastName)}</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <div style="background:#1a2540;border-radius:10px;padding:10px 14px;flex:1;">
          <div style="font-size:10px;color:#8097b8;letter-spacing:1px;">STUDENT ID</div>
          <div style="font-size:18px;font-weight:700;">${esc(d.studentId) || '—'}</div>
        </div>
        <div style="background:#1a2540;border-radius:10px;padding:10px 14px;flex:1;">
          <div style="font-size:10px;color:#8097b8;letter-spacing:1px;">GRADE</div>
          <div style="font-size:18px;font-weight:700;">${esc(d.grade) || '—'}</div>
        </div>
      </div>
      <div style="font-size:12px;color:#8097b8;margin-top:12px;">${esc(d.school)}</div>`);
  }catch(e){
    console.error('ID scan failed:', e);
    showScan('<div style="font-size:16px;font-weight:700;margin-bottom:8px;">Could not load ID</div>' +
      '<div style="font-size:13px;color:#8097b8;">' + esc(e.message) + '</div>');
  }
}

// run the scan check after the app launches (signed-in users)
const origLaunch = window.launchApp;
window.launchApp = function(){
  origLaunch.apply(this, arguments);
  injectPhotoUI();
  checkIdScan();
};

// signed-out person who scanned a code: tell them to sign in
if(new URLSearchParams(location.search).get('id')){
  const err = el('auth-error');
  if(err){
    err.textContent = 'Sign in with your teacher or admin account to view this student ID.';
    err.style.display = '';
  }
}

injectPhotoUI();
})();
