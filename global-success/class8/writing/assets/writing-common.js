
const RESULT_ENDPOINT="https://script.google.com/macros/s/AKfycbxNZI7NGT6KW-5L9rIrjXQHZJLxLuAeXzTICfrSPQFAIpy5pQ7Ce1s78b5wNRKre3XH/exec";
let checkedA=false,checkedB=false,submissionLocked=false;
let latestFeedback={A:[],B:[]};

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(s){return String(s||'').trim().replace(/\s+/g,' ');}
function hasPhrase(s,p){return norm(s).toLowerCase().includes(p.toLowerCase());}
function startsPhrase(s,p){const a=norm(s).toLowerCase(),b=p.toLowerCase();return a===b||a.startsWith(b+' ')||a.startsWith(b+',');}

function renderWriting(){
  const cfg=window.UNIT_CONFIG;
  document.getElementById('unitTitle').textContent=`Class 8 – Writing – ${cfg.unitName}`;
  const empty=!Array.isArray(cfg.phrases)||cfg.phrases.length===0;

  if(empty){
    document.getElementById('partA').innerHTML='<div class="placeholder">Content coming soon. — Nội dung sẽ được cập nhật sau.</div>';
    document.getElementById('partB').innerHTML='<div class="placeholder">Content coming soon. — Nội dung sẽ được cập nhật sau.</div>';
    document.querySelectorAll('.check').forEach(b=>b.disabled=true);
    document.getElementById('submitBtn').disabled=true;
    return;
  }

  ['A','B'].forEach(part=>{
    document.getElementById('part'+part).innerHTML=cfg.phrases.map((x,i)=>`
      <div class="item">
        <div class="term">${i+1}. ${x.phrase}</div>
        <div class="meaning">${x.vi||''}</div>
        <textarea id="${part.toLowerCase()}${i+1}" placeholder="Write one complete sentence..."></textarea>
        <div id="fb${part}${i+1}" class="feedback"></div>
      </div>`).join('');
  });
}

function getIssues(sentence,phrase,part){
  const issues=[];
  const s=norm(sentence);
  if(!s) return ['Please write a sentence. — Hãy viết một câu.'];
  if(s[0]!==s[0].toUpperCase()) issues.push('Start with a capital letter. — Viết hoa chữ cái đầu câu.');
  if(!/[.!?]$/.test(s)) issues.push('Add final punctuation. — Thêm dấu câu ở cuối câu.');
  if(!hasPhrase(s,phrase)) issues.push(`Use the exact phrase “${phrase}”. — Hãy sử dụng đúng cụm “${phrase}”.`);
  if(part==='A'&&!startsPhrase(s,phrase)) issues.push('Place the noun phrase at the beginning as the subject. — Đặt cụm danh từ ở đầu câu để làm chủ ngữ.');
  if(part==='B'&&startsPhrase(s,phrase)) issues.push('The noun phrase should be the object, not the subject. — Cụm danh từ cần làm tân ngữ, không phải chủ ngữ.');
  return issues;
}

function roleExplanation(part){
  return part==='A'
    ? 'The noun phrase should act as the subject. — Cụm danh từ cần đóng vai trò chủ ngữ.'
    : 'The noun phrase should act as the object. — Cụm danh từ cần đóng vai trò tân ngữ.';
}

function validateStudent(){
  if(!document.getElementById('studentName').value.trim()||!document.getElementById('studentClass').value){
    alert('Please enter Student name and Class first. — Hãy nhập tên học sinh và lớp trước.');
    return false;
  }
  return true;
}

function checkPart(part){
  if(!validateStudent()) return;
  const cfg=window.UNIT_CONFIG;
  latestFeedback[part]=[];

  cfg.phrases.forEach((x,i)=>{
    const sentence=document.getElementById(part.toLowerCase()+(i+1)).value;
    const issues=getIssues(sentence,x.phrase,part);
    const passed=issues.length===0;
    const feedbackText=passed
      ? 'Basic checks passed. — Câu đã vượt qua kiểm tra cơ bản.'
      : issues.join(' | ');

    latestFeedback[part].push({
      status:passed?'Passed':'Needs Review',
      feedback:feedbackText
    });

    const fb=document.getElementById('fb'+part+(i+1));
    const examples=part==='A'?(x.subjectExamples||[]):(x.objectExamples||[]);
    fb.classList.add('show');
    fb.innerHTML=(passed
      ? '<div class="good">✓ Basic checks passed. — Câu đã vượt qua kiểm tra cơ bản.</div>'
      : `<div class="bad">Please check / Hãy kiểm tra:</div>${issues.map(v=>'• '+esc(v)).join('<br>')}`)
      +`<div class="explain">${roleExplanation(part)}</div>`
      +(examples.length
        ? `<div class="samples"><b>Sample sentences / Câu mẫu:</b><br>${examples.map((e,j)=>`${j+1}. ${e}`).join('<br>')}</div>`
        : '');
  });

  if(part==='A') checkedA=true; else checkedB=true;
  updateSummary();
}

function updateSummary(){
  if(checkedA&&checkedB){
    const s=document.getElementById('summary');
    s.classList.add('show');
    s.textContent='Both parts have been checked. You can submit now. — Cả hai phần đã được kiểm tra. Bạn có thể nộp bài.';
    if(!submissionLocked) document.getElementById('submitBtn').disabled=false;
  }
}

function submitResult(){
  if(submissionLocked||!validateStudent()||!(checkedA&&checkedB)) return;

  const cfg=window.UNIT_CONFIG;
  const entries=[];

  cfg.phrases.forEach((x,i)=>entries.push({
    part:'A',
    targetPhrase:x.phrase,
    role:'Subject',
    studentSentence:document.getElementById('a'+(i+1)).value,
    status:latestFeedback.A[i]?.status||'',
    feedback:latestFeedback.A[i]?.feedback||''
  }));

  cfg.phrases.forEach((x,i)=>entries.push({
    part:'B',
    targetPhrase:x.phrase,
    role:'Object',
    studentSentence:document.getElementById('b'+(i+1)).value,
    status:latestFeedback.B[i]?.status||'',
    feedback:latestFeedback.B[i]?.feedback||''
  }));

  const payload={
    activityType:'writing',
    studentName:document.getElementById('studentName').value.trim(),
    className:document.getElementById('studentClass').value,
    courseName:'Global Success 8',
    skillName:'Writing',
    unitName:cfg.unitName,
    entries
  };

  let iframe=document.getElementById('resultSenderFrame');
  if(!iframe){
    iframe=document.createElement('iframe');
    iframe.id='resultSenderFrame';iframe.name='resultSenderFrame';
    iframe.style.display='none';document.body.appendChild(iframe);
  }

  const form=document.createElement('form');
  form.method='POST';form.action=RESULT_ENDPOINT;form.target='resultSenderFrame';form.style.display='none';
  const input=document.createElement('input');
  input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);
  form.appendChild(input);document.body.appendChild(form);form.submit();

  submissionLocked=true;
  const btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='Submitted ✓';

  const st=document.getElementById('submitStatus');
  st.className='status ok';
  st.textContent='✓ Writing result submitted — Kết quả Writing đã được gửi.';
  setTimeout(()=>form.remove(),3000);
}

function resetExercise(){
  document.getElementById('studentName').value='';
  document.getElementById('studentClass').value='';
  document.querySelectorAll('textarea').forEach(x=>x.value='');
  document.querySelectorAll('.feedback').forEach(x=>{x.classList.remove('show');x.innerHTML='';});
  checkedA=false;checkedB=false;submissionLocked=false;latestFeedback={A:[],B:[]};
  const s=document.getElementById('summary');s.classList.remove('show');s.textContent='';
  const btn=document.getElementById('submitBtn');btn.disabled=true;btn.textContent='SUBMIT RESULT';
  const st=document.getElementById('submitStatus');st.className='status';st.textContent='';
  window.scrollTo({top:0,behavior:'smooth'});
}
