
let currentUser=null, currentProfile=null, isAdmin=false, jitsiAPI=null;

async function init(){
  try{
    if(typeof supabase === 'undefined'){ console.error('supabase not defined!'); return; }
    const {data:{session}} = await supabase.auth.getSession();
    if(session){ await loadUser(session.user); }
  }catch(e){ console.log('No session', e); }
  loadSubjectsLocal(); 
  loadSchedulesLocal(); 
  loadContactLocal();
}
init();

function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(page);
  if(el) el.classList.add('active');
  if(page==='admin') loadAllUsers();
  if(page==='classroom') loadClassListForJoin();
}
function showTab(t){
  document.getElementById('loginForm').style.display = t==='login'?'block':'none';
  document.getElementById('registerForm').style.display = t==='register'?'block':'none';
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
  if(t==='login') document.querySelectorAll('.tabs button')[0].classList.add('active');
  else document.querySelectorAll('.tabs button')[1].classList.add('active');
}

async function loadUser(user){
  currentUser=user;
  try{
    const {data} = await supabase.from('profiles').select('*').eq('id', user.id).single();
    currentProfile=data;
  }catch(e){
    currentProfile={full_name:user.email, role:'student', email:user.email};
  }
  isAdmin = currentProfile?.role==='admin' || user.email==='deenspace66@gmail.com' || user.email==='tamoorshafiq92@gmail.com';
  const authCard=document.getElementById('authCard');
  if(authCard) authCard.style.display='none';
  const dash=document.getElementById('dashboard');
  if(dash) dash.style.display='block';
  const logoutBtn=document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.style.display='inline-block';
  if(document.getElementById('dashName')) document.getElementById('dashName').textContent=currentProfile?.full_name||user.email;
  if(document.getElementById('dashRole')) document.getElementById('dashRole').textContent=currentProfile?.role||'student';
  if(document.getElementById('dashEmail')) document.getElementById('dashEmail').textContent=user.email;
  if(isAdmin){ 
    const adminNav=document.getElementById('adminNav');
    if(adminNav) adminNav.style.display='inline-block';
  }
}

async function quickJoin(){
  const name=document.getElementById('quickName').value.trim();
  const phone=document.getElementById('quickPhone').value.trim();
  const role=document.getElementById('quickRole').value;
  if(!name||!phone){ alert('Enter name and WhatsApp number'); return; }
  try{
    await supabase.from('quick_joins').insert([{full_name:name, phone:phone, role:role, source:'whatsapp_link'}]);
  }catch(e){ console.log('quick_joins save failed, using local', e); }
  localStorage.setItem('deenspace_guest', JSON.stringify({name, phone, role}));
  alert('Assalamu Alaikum '+name+'! You joined! Now go to Classes.');
  navigate('classes');
}

if(document.getElementById('loginForm')){
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPassword').value;
  const msgEl=document.getElementById('loginMsg');
  msgEl.textContent='Logging in...';
  try{
    const {data, error} = await supabase.auth.signInWithPassword({email, password:pass});
    if(error){ msgEl.textContent='Error: '+error.message; return; }
    msgEl.textContent='Success! Loading...';
    await loadUser(data.user);
    navigate('home');
  }catch(err){
    msgEl.textContent='Error: '+err.message;
  }
});
}

if(document.getElementById('registerForm')){
document.getElementById('registerForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const phone=document.getElementById('regPhone').value.trim();
  const pass=document.getElementById('regPass').value;
  const confirm=document.getElementById('regConfirm').value;
  const role=document.getElementById('regRole').value;
  const msgEl=document.getElementById('regMsg');
  
  if(pass!==confirm){ msgEl.textContent='Passwords no match'; return; }
  if(pass.length<6){ msgEl.textContent='Password must be 6+ characters'; return; }
  
  msgEl.textContent='Creating account... Please wait...';
  
  try{
    const {data, error} = await supabase.auth.signUp({email, password:pass, options:{data:{full_name:name, role:role, phone:phone}}});
    if(error){ msgEl.textContent='Signup Error: '+error.message; return; }
    
    if(data.user){
      msgEl.textContent='Account created! Saving profile...';
      try{
        await supabase.from('profiles').insert([{id:data.user.id, full_name:name, email:email, phone:phone, role: role==='teacher'?'pending_teacher':'student'}]);
      }catch(e){ console.log('profiles insert failed', e); }
      msgEl.textContent='✅ SUCCESS! Account created for '+email+'. Now go to Login tab and login!';
      msgEl.style.color='green';
      setTimeout(()=>{ showTab('login'); document.getElementById('loginEmail').value=email; }, 1500);
    } else {
      msgEl.textContent='Check your email to confirm! Then login.';
    }
  }catch(err){
    msgEl.textContent='Error: '+err.message;
    console.error(err);
  }
});
}

function loadSubjectsLocal(){
  const grid=document.getElementById('subjectsGrid');
  if(!grid) return;
  const defaults=[
    {name:'Namaz (Prayer)', desc:'Learn 5 daily prayers'},
    {name:'Noorani Qaida', desc:'Basic Arabic alphabets'},
    {name:'Nazra Quran', desc:'Quran reading with Tajweed'},
    {name:'Hifz-e-Quran', desc:'Memorization'},
    {name:'Tarjama', desc:'Translation'},
    {name:'Tajweed', desc:'Pronunciation rules'}
  ];
  grid.innerHTML = defaults.map(s=>`<div class="subject"><b>${s.name}</b><small>${s.desc}</small></div>`).join('');
}

function loadSchedulesLocal(){
  const list=document.getElementById('scheduleList');
  if(!list) return;
  list.innerHTML='<div class="class-item"><div><b>Daily Noorani Qaida - 7PM</b><br><small>Room: DeenSpace-General</small></div><button onclick="joinClassRoom(\'DeenSpace-General\',\'General Class\')">Join 🎥</button></div>';
}

function loadClassListForJoin(){
  const el=document.getElementById('classListForJoin');
  if(!el) return;
  el.innerHTML='<button style="margin:5px;padding:12px;background:#0f5132;color:white;border:none;border-radius:8px" onclick="joinClassRoom(\'DeenSpace-General\',\'General Class\')">Join General Class 🎥</button>';
}

function joinClassRoom(roomName, title){
  const titleEl=document.getElementById('classroomTitle');
  if(titleEl) titleEl.textContent = title || roomName;
  const guest=JSON.parse(localStorage.getItem('deenspace_guest')||'{}');
  const displayName=currentProfile?.full_name||guest.name||'Student';
  document.getElementById('jitsiContainer').innerHTML='<iframe src="https://meet.jit.si/'+roomName+'" style="width:100%;height:600px;border:none" allow="camera; microphone; fullscreen; display-capture"></iframe>';
}

function loadContactLocal(){
  const el=document.getElementById('contactInfo');
  if(!el) return;
  el.innerHTML='<p><b>Qari Saab</b><br>📞 0300-1234567<br>💬 WhatsApp: 03001234567<br>✉️ deenspace66@gmail.com<br>📍 Gujranwala, Punjab</p>';
}

async function loadAllUsers(){
  const list=document.getElementById('allUsersList');
  if(list) list.innerHTML='<p>Check Supabase Dashboard > Authentication > Users to see all users</p>';
}

async function logout(){
  await supabase.auth.signOut();
  localStorage.removeItem('deenspace_guest');
  location.reload();
}

function sendChat(){
  const input=document.getElementById('chatInput');
  if(!input) return;
  const txt=input.value.trim();
  if(!txt) return;
  const name=currentProfile?.full_name||'Student';
  const div=document.createElement('div'); div.textContent=`${name}: ${txt}`;
  const chat=document.getElementById('classChat');
  if(chat) chat.appendChild(div);
  input.value='';
}
