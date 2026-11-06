// ============================================================
// TERM GRADEBOOK
// Drafts (teacher only) -> Post -> termGrades (students/parents read)
// Admin opens/closes terms. Every edit/post is written to gradeLog.
// ============================================================
const GB_TERMS=['Q1','Q2','S1','Q3','Q4','S2'];
const GB_SEM={S1:['Q1','Q2'],S2:['Q3','Q4']};
const GB_DEFAULT_SCALE=[[90,'A'],[80,'B'],[70,'C'],[60,'D'],[0,'F']]; // 10-point; override with schoolSettings.gradeScale
let gbSettings={open:{},deadline:{}};
let gbRows=[];
let gbSelectedTerm='Q1';
let gbExpandedStudent=null;
let gbStudentTerms={};
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
    await gbRenderStudent(pane);
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
  const grades=currentClass.grades||{};
  gbRows=users.filter(s=>s.exists).map(s=>({uid:s.id,name:s.data().name,draft:dm[s.id]||{},posted:pm[s.id]||{},assignmentGrades:grades}))
    .sort((a,b)=>a.name.localeCompare(b.name));
}

async function gbRenderTeacher(){
  const pane=document.getElementById('grade-entry-list');
  if(!pane||!currentClass)return;
  pane.innerHTML='<div class="empty-state">Loading gradebook…</div>';
  try{
    await gbLoadSettings();
    await gbLoadStaff();
    gbDraw(pane);
  }catch(e){
    pane.innerHTML=`<div class="empty-state">Could not load gradebook: ${gbEsc(e.message)}</div>`;
  }
}

function gbDraw(pane){
  const isAdmin=currentUserData.isAdmin;
  const selected=gbSelectedTerm;
  const open=gbSettings.open[selected]===true;
  const terms=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${GB_TERMS.map(t=>`<button onclick="gbSelectHomeTerm('${t}')" class="btn-sm" style="padding:7px 14px;border:1px solid ${selected===t?'#3b82f6':'var(--border)'};border-radius:8px;background:${selected===t?'rgba(59,130,246,.16)':'var(--card2)'};color:${selected===t?'#60a5fa':'var(--gray-light)'};font-weight:700;cursor:pointer;">${t}</button>`).join('')}</div>`;
  const termInfo=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
    <div style="font-size:12px;color:var(--gray);">${open?'Open for grading':`Locked${gbSettings.deadline[selected]?' · due '+gbEsc(gbSettings.deadline[selected]):''}`}. ${selected.startsWith('S')?'Semester grade can be entered directly or suggested from the two quarters.':'Select a student to open their assignments.'}</div>
    ${open?`<button class="btn-blue btn-sm" onclick="gbPost('${selected}')">Post ${selected} grades</button>`:'<span style="font-size:11px;color:var(--gray);">This term is locked</span>'}
  </div>`;
  const body=gbRows.map(r=>{
    const eff=gbEffective(r.draft,selected);
    const shown=open?eff:(r.posted[selected]??null);
    const suggest=GB_SEM[selected]&&r.draft[selected]==null&&eff!=null?eff:'';
    const assignments=(currentClass.assignments||[]).filter(a=>!a.term||a.term===selected);
    const earned=assignments.reduce((sum,a)=>{const g=(r.assignmentGrades[a.id]||{})[r.uid];return g!=null?sum+Number(g)*(Number(a.weight||0)/100):sum;},0);
    const weight=assignments.reduce((sum,a)=>{const g=(r.assignmentGrades[a.id]||{})[r.uid];return g!=null?sum+Number(a.weight||0)/100:sum;},0);
    const avg=weight?Math.round(earned/weight):null;
    const risk=GB_TERMS.some(t=>{const v=gbEffective(r.draft,t);return v!=null&&v<70;});
    const input=open?`<input type="number" min="0" max="100" value="${r.draft[selected]??''}" placeholder="${suggest===''?'—':suggest}" onchange="gbSave('${r.uid}','${selected}',this.value)" style="width:72px;background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:6px;color:var(--white);text-align:center;font-size:13px;${suggest!==''?'font-style:italic;':''}"> <span style="font-size:11px;color:var(--gray);">%</span>`:`<span>${gbChip(shown)}</span>`;
    const expanded=gbExpandedStudent===r.uid;
    const studentTerm=gbStudentTerms[r.uid]||selected;
    const detail=expanded?`<tr><td colspan="3" style="padding:0 10px 12px;"><div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
        <strong style="color:var(--white);">${gbEsc(r.name)} — assignments</strong>
        <label style="font-size:12px;color:var(--gray-light);">Term <select class="input" style="display:inline-block;width:auto;margin:0 0 0 6px;padding:5px 8px;" onchange="gbSelectStudentTerm('${r.uid}',this.value)">${GB_TERMS.map(t=>`<option value="${t}" ${studentTerm===t?'selected':''}>${t}</option>`).join('')}</select></label>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:var(--gray-light);">
        <span>${studentTerm} grade</span>${gbGradeEditor(r,studentTerm)}
        ${GB_SEM[studentTerm]?'<span>Suggested from quarter grades when no semester grade is entered.</span>':''}
      </div>
      ${gbAssignmentRows(r,studentTerm)}
    </div></td></tr>`:'';
    return `<tr style="border-bottom:1px solid var(--border);${risk?'background:rgba(239,68,68,.07);':''}">
      <td style="padding:8px;"><button onclick="gbToggleStudent('${r.uid}')" style="background:none;border:0;color:var(--white);font:inherit;font-weight:600;text-align:left;cursor:pointer;">${expanded?'▾':'▸'} ${gbEsc(r.name)}${risk?' <span style="font-size:10px;color:#ef4444;">At risk</span>':''}</button></td>
      <td style="padding:6px;text-align:center;">${input} ${gbLetter(shown)?`<span style="font-size:10px;color:${gbColor(gbLetter(shown))};font-weight:700;">${gbLetter(shown)}</span>`:''}</td>
      <td style="padding:8px;text-align:center;color:var(--gray-light);">${avg==null?'—':`${avg}%`}</td></tr>${detail}`;
  }).join('');
  const admin=isAdmin?`<div class="card" style="margin-bottom:12px;"><div class="card-label">ADMIN — OPEN / CLOSE TERMS</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">${GB_TERMS.map(t=>`<label style="font-size:12px;color:var(--white);display:flex;flex-direction:column;gap:4px;">
      <span><input type="checkbox" id="gb-open-${t}" ${gbSettings.open[t]?'checked':''}> ${t} open</span>
      <input type="date" id="gb-dl-${t}" value="${gbEsc(gbSettings.deadline[t]||'')}" class="input" style="margin:0;padding:4px 8px;font-size:12px;"></label>`).join('')}</div>
    <button class="btn-blue btn-sm" style="margin-top:10px;" onclick="gbSaveSettings()">Save terms</button></div>`:'';
  pane.innerHTML=`${admin}<div class="card"><div class="card-label">GRADEBOOK — ${gbEsc(currentClass.name)}</div>
    ${terms}${termInfo}
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="border-bottom:2px solid var(--border);color:var(--gray);"><th style="text-align:left;padding:8px;">Student</th><th style="text-align:center;padding:8px;">${selected} grade</th><th style="text-align:center;padding:8px;">Assignment avg.</th></tr></thead>
      <tbody>${body||'<tr><td colspan="3" class="empty-state">No students yet</td></tr>'}</tbody></table></div>
      <div style="font-size:11px;color:var(--gray);margin-top:10px;">Click a student to enter assignment scores and edit that student’s quarter or semester grade. Students see term grades after they are posted.</div></div>
    <div class="card" style="margin-top:12px;"><div class="card-label">RECENT GRADE CHANGES</div><div id="gb-log"><div class="empty-state">Loading…</div></div></div>`;
  gbLoadLog();
}

function gbGradeEditor(row,term){
  const open=gbSettings.open[term]===true;
  const effective=gbEffective(row.draft,term);
  const shown=open?effective:(row.posted[term]??null);
  const suggestion=GB_SEM[term]&&row.draft[term]==null&&effective!=null?effective:'';
  return open
    ?`<input type="number" min="0" max="100" value="${row.draft[term]??''}" placeholder="${suggestion===''?'—':suggestion}" onchange="gbSave('${row.uid}','${term}',this.value)" style="width:72px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px;color:var(--white);text-align:center;"> %${gbLetter(effective)?` <strong style="color:${gbColor(gbLetter(effective))}">${gbLetter(effective)}</strong>`:''}`
    :`<span style="font-weight:700;color:var(--white);">${shown==null?'—':`${shown}% ${gbLetter(shown)}`}</span><span style="font-size:10px;color:var(--gray);"> ${shown==null?'Locked':'(locked)'}</span>`;
}

function gbAssignmentRows(row,term){
  const assignments=(currentClass.assignments||[]).filter(a=>!a.term||a.term===term);
  if(!assignments.length)return '<div class="empty-state">No assignments for this term yet.</div>';
  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="color:var(--gray);border-bottom:1px solid var(--border);"><th style="text-align:left;padding:7px;">Assignment</th><th style="text-align:center;padding:7px;">Weight</th><th style="text-align:center;padding:7px;">Score (%)</th></tr></thead>
    <tbody>${assignments.map(a=>{const grade=(row.assignmentGrades[a.id]||{})[row.uid];return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:7px;color:var(--white);">${gbEsc(a.name)}</td><td style="padding:7px;text-align:center;color:var(--gray-light);">${gbEsc(a.weight||0)}%</td><td style="padding:4px;text-align:center;"><input type="number" min="0" max="100" value="${grade??''}" placeholder="—" onchange="gbSaveAssignment('${a.id}','${row.uid}',this.value)" style="width:76px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px;color:var(--white);text-align:center;">${grade==null?'':'%'}</td></tr>`;}).join('')}</tbody></table></div>
    ${(currentClass.assignments||[]).some(a=>!a.term)?'<div style="font-size:10px;color:var(--gray);margin-top:8px;">Older assignments without a term are shown in every term.</div>':''}`;
}

function gbSelectHomeTerm(term){
  if(!GB_TERMS.includes(term))return;
  gbSelectedTerm=term;
  gbDraw(document.getElementById('grade-entry-list'));
}
function gbSetAssignmentTerm(){
  const select=document.getElementById('pa-term');
  if(select)select.value=gbSelectedTerm;
}
function gbSelectStudentTerm(uid,term){
  if(!GB_TERMS.includes(term))return;
  gbStudentTerms[uid]=term;
  gbDraw(document.getElementById('grade-entry-list'));
}
function gbToggleStudent(uid){
  gbExpandedStudent=gbExpandedStudent===uid?null:uid;
  gbDraw(document.getElementById('grade-entry-list'));
}
async function gbSaveAssignment(assignmentId,studentUid,raw){
  if(!currentClass)return;
  const grade=raw===''?null:Number(raw);
  if(grade!==null&&(!Number.isFinite(grade)||grade<0||grade>100)){
    alert('Enter an assignment score from 0 to 100.');
    return gbDraw(document.getElementById('grade-entry-list'));
  }
  const path=`grades.${assignmentId}.${studentUid}`;
  try{
    await db.collection('classrooms').doc(currentClass.id).update({[path]:grade===null?FS.delete():grade});
    const grades={...(currentClass.grades||{})};
    grades[assignmentId]={...(grades[assignmentId]||{})};
    if(grade===null)delete grades[assignmentId][studentUid];
    else grades[assignmentId][studentUid]=grade;
    currentClass={...currentClass,grades};
    await gbRenderTeacher();
  }catch(e){
    alert('Could not save assignment grade: '+e.message);
    await gbRenderTeacher();
  }
}

async function gbSave(uid,term,raw){
  if(gbSettings.open[term]!==true){alert('This term is locked.');return gbRender();}
  const row=gbRows.find(r=>r.uid===uid);if(!row)return;
  const val=raw===''?null:Number(raw);
  if(val!==null&&(!Number.isFinite(val)||val<0||val>100)){alert('Enter a number from 0 to 100.');return gbDraw(document.getElementById('grade-entry-list'));}
  const from=row.draft[term]??null;if(val===from)return;
  let reason='';
  if(row.posted[term]!=null){reason=prompt('This grade is already posted. Reason for the change?');if(!reason)return gbDraw(document.getElementById('grade-entry-list'));}
  try{
    await db.collection('termDrafts').doc(currentClass.id+'_'+uid).set({
      classId:currentClass.id,studentUid:uid,school:currentUserData.school,teacherUid:currentClass.teacherUid,
      scores:{[term]:val===null?FS.delete():val},updatedAt:FS.serverTimestamp()},{merge:true});
  }catch(e){
    alert('Could not save term grade: '+e.message);
    await gbRenderTeacher();
    return;
  }
  if(val===null)delete row.draft[term];else row.draft[term]=val;
  try{await gbLog({type:'edit',studentUid:uid,studentName:row.name,term,from,to:val,reason});}
  catch(e){alert('Grade saved, but its change history could not be updated: '+e.message);}
  gbDraw(document.getElementById('grade-entry-list'));
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
  try{await batch.commit();}
  catch(e){alert('Could not post '+term+' grades: '+e.message);return;}
  items.forEach(({r,v})=>{r.posted[term]=v;if(r.draft[term]==null)r.draft[term]=v;});
  try{await gbLog({type:'post',term,count:items.length});}
  catch(e){alert(term+' grades were posted, but the change history could not be updated: '+e.message);}
  gbDraw(document.getElementById('grade-entry-list'));
  showToast(term+' grades posted','success');
}

async function gbSaveSettings(){
  if(!currentUserData.isAdmin)return;
  const open={},deadline={};
  GB_TERMS.forEach(t=>{open[t]=document.getElementById('gb-open-'+t).checked;const d=document.getElementById('gb-dl-'+t).value;if(d)deadline[t]=d;});
  await db.collection('termSettings').doc(gbSettingsId()).set({school:currentUserData.school,open,deadline,updatedBy:currentUserData.name,updatedAt:FS.serverTimestamp()});
  gbRenderTeacher();
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

// Keep a read-only term summary for students; teachers use the Gradebook tab.
function gbInject(){
  if(gbIsStaff())return;
  const page=document.getElementById('page-classroom-detail');if(!page)return;
  const firstTab=page.querySelector('.tab-btn');
  if(firstTab&&!document.getElementById('gb-tab-btn')){
    const b=document.createElement('button');b.id='gb-tab-btn';b.className='tab-btn';b.textContent='My Term Grades';
    b.onclick=function(){switchCDTab('termgrades',this);};
    firstTab.parentElement.appendChild(b);
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
window.gbRenderTeacher=gbRenderTeacher;window.gbSaveAssignment=gbSaveAssignment;
window.gbSelectHomeTerm=gbSelectHomeTerm;window.gbSelectStudentTerm=gbSelectStudentTerm;window.gbToggleStudent=gbToggleStudent;
window.gbSetAssignmentTerm=gbSetAssignmentTerm;
