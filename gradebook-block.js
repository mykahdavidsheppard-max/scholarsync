// ============================================================
// TERM GRADEBOOK  (paste at the very END of app.js)
// Drafts (teacher only) -> Post -> termGrades (students/parents read)
// Admin opens/closes terms. Every edit/post is written to gradeLog.
// ============================================================
const GB_TERMS=['Q1','Q2','S1','Q3','Q4','S2'];
const GB_SEM={S1:['Q1','Q2'],S2:['Q3','Q4']};
const GB_DEFAULT_SCALE=[[90,'A'],[80,'B'],[70,'C'],[60,'D'],[0,'F']]; // 10-point; override with schoolSettings.gradeScale
let gbSettings={open:{},deadline:{}};
let gbRows=[];
const gbEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbSettingsId=()=>(currentUserData.school||'').replace(/\//g,'-');
const gbScale=()=>cachedSchoolSettings?.gradeScale||GB_DEFAULT_SCALE;
function gbLetter(n){if(n==null)return '';for(const [m,l] of gbScale())if(n>=m)return l;return 'F';}
function gbColor(l){return {A:'#22c55e',B:'#3b82f6',C:'#f59e0b',D:'#f97316',F:'#ef4444'}[l]||'var(--gray)';}
function gbChip(n){if(n==null)return '<span style="color:var(--gray)">—</span>';const l=gbLetter(n);
  return `<span style="font-weight:700;color:var(--white);">${n}</span> <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;background:${gbColor(l)}22;color:${gbColor(l)};">${l}</span>`;}
// Semester suggestion = weighted average of its two quarters (weights adjustable per school)
function gbEffective(scores,term){
  if(scores[term]!=null)return scores[term];
  const q=GB_SEM[term];if(!q)return null;
  const v=q.map(t=>scores[t]);if(v.some(x=>x==null))return null;
  const w=cachedSchoolSettings?.semesterWeights||[50,50];
  return Math.round((v[0]*w[0]+v[1]*w[1])/(w[0]+w[1]));
}
async function gbLoadSettings(){
  const snap=await db.collection('termSettings').doc(gbSettingsId()).get();
  gbSettings=snap.exists?{open:snap.data().open||{},deadline:snap.data().deadline||{}}:{open:{},deadline:{}};
}
const gbIsStaff=()=>currentClass&&(currentClass.teacherUid===currentUser.uid||currentUserData.isAdmin);

async function gbRender(){
  const pane=document.getElementById('cd-termgrades-tab');if(!pane||!currentClass)return;
  pane.innerHTML='<div class="empty-state">Loading…</div>';
  try{
    await gbLoadSettings();
    if(gbIsStaff())await gbLoadStaff();
    gbIsStaff()?gbDraw(pane):await gbRenderStudent(pane);
  }catch(e){pane.innerHTML=`<div class="empty-state">Could not load grades: ${gbEsc(e.message)}</div>`;}
}

async function gbLoadStaff(){
  const cid=currentClass.id;
  const [users,drafts,posted]=await Promise.all([
    Promise.all((currentClass.students||[]).map(u=>db.collection('users').doc(u).get())),
    db.collection('termDrafts').where('classId','==',cid).get(),
    db.collection('termGrades').where('classId','==',cid).get()
  ]);
  const dm={},pm={};
  drafts.docs.forEach(d=>dm[d.data().studentUid]=d.data().scores||{});
  posted.docs.forEach(d=>pm[d.data().studentUid]=d.data().scores||{});
  gbRows=users.filter(s=>s.exists).map(s=>({uid:s.id,name:s.data().name,draft:dm[s.id]||{},posted:pm[s.id]||{}}))
    .sort((a,b)=>a.name.localeCompare(b.name));
}

function gbDraw(pane){
  const isAdmin=currentUserData.isAdmin;
  const head=GB_TERMS.map(t=>{
    const open=gbSettings.open[t]===true;
    return `<th style="padding:8px;text-align:center;min-width:92px;">
      <div style="color:var(--white);">${t}</div>
      <div style="font-size:10px;font-weight:400;color:${open?'#3b82f6':'var(--gray)'};">${open?'Open':'Locked'}${gbSettings.deadline[t]?' · due '+gbEsc(gbSettings.deadline[t]):''}</div>
      ${open?`<button class="btn-blue btn-sm" style="margin-top:4px;" onclick="gbPost('${t}')">Post ${t}</button>`:''}
    </th>`;}).join('');
  const body=gbRows.map(r=>{
    const cells=GB_TERMS.map(t=>{
      const open=gbSettings.open[t]===true,eff=gbEffective(r.draft,t);
      const dirty=r.posted[t]!=null&&eff!==r.posted[t];
      if(open){
        const sugg=GB_SEM[t]&&r.draft[t]==null&&eff!=null?eff:'';
        return `<td style="padding:4px;text-align:center;"><input type="number" min="0" max="100" value="${r.draft[t]??''}" placeholder="${sugg===''?'—':sugg}"
          onchange="gbSave('${r.uid}','${t}',this.value)"
          style="width:64px;background:var(--card2);border:1px solid ${dirty?'#f59e0b':'var(--border)'};border-radius:6px;padding:5px;color:var(--white);text-align:center;font-size:13px;${sugg!==''?'font-style:italic;':''}">
          ${gbLetter(eff)?`<span style="font-size:10px;color:${gbColor(gbLetter(eff))};font-weight:700;"> ${gbLetter(eff)}</span>`:''}</td>`;
      }
      return `<td style="padding:8px;text-align:center;font-size:13px;">${gbChip(r.posted[t]??null)}</td>`;
    }).join('');
    const avgQ=gbEffective(r.draft,'S1');
    const risk=GB_TERMS.some(t=>{const v=gbEffective(r.draft,t);return v!=null&&v<70;});
    return `<tr style="border-bottom:1px solid var(--border);${risk?'background:rgba(239,68,68,.07);':''}">
      <td style="padding:8px;color:var(--white);font-weight:600;">${gbEsc(r.name)}${risk?' <span style="font-size:10px;color:#ef4444;">At risk</span>':''}</td>${cells}</tr>`;
  }).join('');
  const admin=isAdmin?`<div class="card" style="margin-bottom:12px;"><div class="card-label">ADMIN — OPEN / CLOSE TERMS</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">${GB_TERMS.map(t=>`<label style="font-size:12px;color:var(--white);display:flex;flex-direction:column;gap:4px;">
      <span><input type="checkbox" id="gb-open-${t}" ${gbSettings.open[t]?'checked':''}> ${t} open</span>
      <input type="date" id="gb-dl-${t}" value="${gbEsc(gbSettings.deadline[t]||'')}" class="input" style="margin:0;padding:4px 8px;font-size:12px;"></label>`).join('')}</div>
    <button class="btn-blue btn-sm" style="margin-top:10px;" onclick="gbSaveSettings()">Save terms</button></div>`:'';
  pane.innerHTML=`${admin}
    <div class="card"><div class="card-label">TERM GRADES — ${gbEsc(currentClass.name)}</div>
    <div style="font-size:12px;color:var(--gray);margin-bottom:10px;">Type a grade for any open term. Students only see grades after you press Post. Italic numbers are suggested semester grades; type over them to override.</div>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="border-bottom:2px solid var(--border);color:var(--gray);"><th style="text-align:left;padding:8px;">Student</th>${head}</tr>${body||'<tr><td colspan="7" class="empty-state">No students yet</td></tr>'}</table></div></div>
    <div class="card" style="margin-top:12px;"><div class="card-label">RECENT CHANGES</div><div id="gb-log"><div class="empty-state">Loading…</div></div></div>`;
  gbLoadLog();
}

async function gbSave(uid,term,raw){
  if(gbSettings.open[term]!==true){alert('This term is locked.');return gbRender();}
  const row=gbRows.find(r=>r.uid===uid);if(!row)return;
  const val=raw===''?null:Number(raw);
  if(val!==null&&(isNaN(val)||val<0||val>100)){alert('Enter a number from 0 to 100.');return gbDraw(document.getElementById('cd-termgrades-tab'));}
  const from=row.draft[term]??null;if(val===from)return;
  let reason='';
  if(row.posted[term]!=null){reason=prompt('This grade is already posted. Reason for the change?');if(!reason)return gbDraw(document.getElementById('cd-termgrades-tab'));}
  await db.collection('termDrafts').doc(currentClass.id+'_'+uid).set({
    classId:currentClass.id,studentUid:uid,school:currentUserData.school,teacherUid:currentClass.teacherUid,
    scores:{[term]:val===null?FS.delete():val},updatedAt:FS.serverTimestamp()},{merge:true});
  await gbLog({type:'edit',studentUid:uid,studentName:row.name,term,from,to:val,reason});
  if(val===null)delete row.draft[term];else row.draft[term]=val;
  gbDraw(document.getElementById('cd-termgrades-tab'));
}

async function gbPost(term){
  if(gbSettings.open[term]!==true)return alert('This term is locked.');
  const items=gbRows.map(r=>({r,v:gbEffective(r.draft,term)})).filter(x=>x.v!=null);
  if(!items.length)return alert('No grades entered for '+term+' yet.');
  if(!confirm(`Post ${term} grades for ${items.length} student(s)? Students will be able to see them.`))return;
  const batch=db.batch();
  items.forEach(({r,v})=>{
    batch.set(db.collection('termGrades').doc(currentClass.id+'_'+r.uid),{
      classId:currentClass.id,studentUid:r.uid,school:currentUserData.school,className:currentClass.name,
      teacherName:currentClass.teacherName,gpaBonus:currentClass.gpaBonus||0,
      scores:{[term]:v},postedAt:FS.serverTimestamp()},{merge:true});
    if(r.draft[term]==null)batch.set(db.collection('termDrafts').doc(currentClass.id+'_'+r.uid),{classId:currentClass.id,studentUid:r.uid,school:currentUserData.school,teacherUid:currentClass.teacherUid,scores:{[term]:v}},{merge:true});
  });
  await batch.commit();
  items.forEach(({r,v})=>{r.posted[term]=v;if(r.draft[term]==null)r.draft[term]=v;});
  await gbLog({type:'post',term,count:items.length});
  gbDraw(document.getElementById('cd-termgrades-tab'));
  showToast(term+' grades posted','success');
}

async function gbSaveSettings(){
  if(!currentUserData.isAdmin)return;
  const open={},deadline={};
  GB_TERMS.forEach(t=>{open[t]=document.getElementById('gb-open-'+t).checked;const d=document.getElementById('gb-dl-'+t).value;if(d)deadline[t]=d;});
  await db.collection('termSettings').doc(gbSettingsId()).set({school:currentUserData.school,open,deadline,updatedBy:currentUserData.name,updatedAt:FS.serverTimestamp()});
  gbRender();
}

function gbLog(entry){
  return db.collection('gradeLog').add({...entry,classId:currentClass.id,className:currentClass.name,school:currentUserData.school,
    by:currentUser.uid,byName:currentUserData.name,at:FS.serverTimestamp()});
}
async function gbLoadLog(){
  const el=document.getElementById('gb-log');if(!el)return;
  const snap=await db.collection('gradeLog').where('classId','==',currentClass.id).get();
  const items=snap.docs.map(d=>d.data()).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0)).slice(0,8);
  el.innerHTML=items.length?items.map(l=>{
    const when=l.at?.toDate?l.at.toDate().toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'just now';
    const what=l.type==='post'?`posted ${l.term} grades (${l.count} students)`:`changed ${gbEsc(l.studentName)} ${l.term}: ${l.from??'—'} → ${l.to??'—'}${l.reason?` (${gbEsc(l.reason)})`:''}`;
    return `<div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);color:var(--gray-light);"><strong style="color:var(--white);">${gbEsc(l.byName)}</strong> ${what}<div style="font-size:10px;color:var(--gray);">${when}</div></div>`;
  }).join(''):'<div class="empty-state">No changes yet</div>';
}

// ---- STUDENT VIEW: posted grades only + GPA ----
function gbFinal(scores){
  for(const t of ['S2','S1','Q4','Q3','Q2','Q1'])if(scores[t]!=null)return scores[t];return null;
}
const gbPoints=l=>({A:4,B:3,C:2,D:1,F:0}[l]??0);
async function gbRenderStudent(pane){
  const snap=await db.collection('termGrades').where('studentUid','==',currentUser.uid).get();
  const docs=snap.docs.map(d=>d.data());
  const mine=docs.find(d=>d.classId===currentClass.id)?.scores||{};
  let uw=0,w=0,n=0;
  docs.forEach(d=>{const f=gbFinal(d.scores||{});if(f==null)return;const p=gbPoints(gbLetter(f));uw+=p;w+=p+(p>0?(d.gpaBonus||0):0);n++;});
  const gpa=n?`<div style="display:flex;gap:12px;margin-bottom:12px;">
    <div class="card" style="flex:1;"><div class="card-label">GPA UNWEIGHTED</div><div style="font-size:26px;font-weight:700;color:var(--white);">${(uw/n).toFixed(2)}</div></div>
    <div class="card" style="flex:1;"><div class="card-label">GPA WEIGHTED</div><div style="font-size:26px;font-weight:700;color:var(--white);">${(w/n).toFixed(2)}</div></div></div>`:'';
  pane.innerHTML=`${gpa}<div class="card"><div class="card-label">MY TERM GRADES — ${gbEsc(currentClass.name)}</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;text-align:center;">
    ${GB_TERMS.map(t=>`<div><div style="font-size:11px;color:var(--gray);margin-bottom:4px;">${t}</div><div>${gbChip(mine[t]??null)}</div></div>`).join('')}</div>
    <div style="font-size:11px;color:var(--gray);margin-top:10px;">Only grades your teacher has posted appear here.</div></div>`;
}

// ---- HOOKS: add a "Term Grades" tab to the classroom page without editing existing code ----
function gbInject(){
  const page=document.getElementById('page-classroom-detail');if(!page)return;
  const row=page.querySelector('.tab-row');
  if(row&&!document.getElementById('gb-tab-btn')){
    const b=document.createElement('button');b.id='gb-tab-btn';b.className='tab-btn';b.textContent='Term Grades';
    b.onclick=function(){switchCDTab('termgrades',this);};row.appendChild(b);
  }
  if(!document.getElementById('cd-termgrades-tab')){
    const anchor=document.getElementById('cd-grades-tab');if(!anchor)return;
    const p=document.createElement('div');p.id='cd-termgrades-tab';p.style.display='none';anchor.parentElement.appendChild(p);
  }
}
const _gbSwitch=switchCDTab;
window.switchCDTab=function(tab,el){
  _gbSwitch(tab,el);
  const p=document.getElementById('cd-termgrades-tab');
  if(p)p.style.display=tab==='termgrades'?'':'none';
  if(tab==='termgrades')gbRender();
};
const _gbOpenClassroom=openClassroom;
window.openClassroom=async function(id){await _gbOpenClassroom(id);gbInject();};
window.gbSave=gbSave;window.gbPost=gbPost;window.gbSaveSettings=gbSaveSettings;window.gbRender=gbRender;
