
let currentUser=null, currentProfile=null, isAdmin=false, jitsiAPI=null, canScreenShare=false;

async function init(){
  const {data:{session}} = await supabase.auth.getSession();
  if(session){ await loadUser(session.user); }
  loadSubjects(); loadSchedules(); loadContact();
  // Check WhatsApp auto-join ?ref=whatsapp
  const params = new URLSearchParams(window.location.search);
  if(params.get('join')==='wa' || params.get('from')==='whatsapp'){
    document.getElementById('whatsappJoinBox').scrollIntoView();
  }
}
init();

function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(page).classList.add('active');
  if(page==='admin') loadAllUsers();
  if(page==='classroom') loadClassListForJoin();
}
function showTab(t){
  document.getElementById('loginForm').style.display = t==='login'?'block':'none';
  document.getElementById('registerForm').style.display = t==='register'?'block':'none';
}

async function loadUser(user){
  currentUser=user;
  const {data} = await supabase.from('profiles').select('*').eq('id', user.id).single();
  currentProfile=data;
  isAdmin = data?.role==='admin' || user.email==='deenspace66@gmail.com';
  document.getElementById('authCard').style.display='none';
  document.getElementById('dashboard').style.display='block';
  document.getElementById('logoutBtn').style.display='inline-block';
  document.getElementById('dashName').textContent=data?.full_name||user.email;
  document.getElementById('dashRole').textContent=data?.role||'student';
  document.getElementById('dashEmail').textContent=user.email;
  document.getElementById('dashBadge').innerHTML = isAdmin?'<span class="badge badge-admin">ADMIN</span>': data?.role==='teacher'?'<span class="badge badge-teacher">TEACHER</span>':'<span class="badge badge-student">STUDENT</span>';
  if(isAdmin){ document.getElementById('adminNav').style.display='inline-block'; document.getElementById('editSubjectsBtn').style.display='inline-block'; document.getElementById('editScheduleBtn').style.display='inline-block'; document.getElementById('editContactBtn').style.display='inline-block'; }
  document.getElementById('heroSub').textContent = isAdmin ? 'You are Admin - control everything' : 'Welcome back to class!';
}

async function quickJoin(){
  const name=document.getElementById('quickName').value.trim();
  const phone=document.getElementById('quickPhone').value.trim();
  const role=document.getElementById('quickRole').value;
  if(!name||!phone){ alert('Enter name and WhatsApp number'); return; }
  // Create guest profile in Supabase (no auth)
  const {data, error} = await supabase.from('quick_joins').insert([{full_name:name, phone:phone, role:role, source:'whatsapp_link'}]).select();
  if(error){ alert(error.message); return; }
  // Log for admin email
  await supabase.from('join_logs').insert([{name:name, phone:phone, role:role, email: name+' (guest)', type:'whatsapp_quick'}]);
  // Send email notification via edge function (simulate)
  await notifyAdminEmail(name, phone, role, 'WhatsApp Quick Join');
  alert('Assalamu Alaikum '+name+'! You joined! Now go to Classes and Join Live Class.');
  document.getElementById('dashName')? document.getElementById('dashName').textContent=name : null;
  // Store locally as guest session
  localStorage.setItem('deenspace_guest', JSON.stringify({name, phone, role}));
  navigate('classes');
}

document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPassword').value;
  const {data, error} = await supabase.auth.signInWithPassword({email, password:pass});
  if(error){ document.getElementById('loginMsg').textContent=error.message; return; }
  await loadUser(data.user);
});

document.getElementById('registerForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const phone=document.getElementById('regPhone').value.trim();
  const pass=document.getElementById('regPass').value;
  const confirm=document.getElementById('regConfirm').value;
  const role=document.getElementById('regRole').value;
  if(pass!==confirm){ document.getElementById('regMsg').textContent='Passwords no match'; return; }
  const {data, error} = await supabase.auth.signUp({email, password:pass, options:{data:{full_name:name, role:role, phone:phone}}});
  if(error){ document.getElementById('regMsg').textContent=error.message; return; }
  if(data.user){
    await supabase.from('profiles').insert([{id:data.user.id, full_name:name, email:email, phone:phone, role:role==='teacher'?'pending_teacher':'student'}]);
    await supabase.from('join_logs').insert([{name:name, phone:phone, role:role, email:email, type:'registered'}]);
    await notifyAdminEmail(name, phone, role, 'New Registration - '+email);
  }
  document.getElementById('regMsg').textContent='Account created! Please check email and Login. Admin will get email.';
});

async function notifyAdminEmail(name, phone, role, type){
  // This inserts into a table that you can connect to Zapier / Make.com to send Gmail
  // For now also console - you can set up Supabase Email hook to deenspace66@gmail.com
  console.log('NEW JOIN:', name, phone, role);
  // Try Edge Function if you have one - otherwise admin will see in Admin Panel
  try{
    await supabase.functions.invoke('send-admin-email', {body:{to:'deenspace66@gmail.com', name, phone, role, type}});
  }catch(e){ /* ignore if no function */ }
}

async function loadSubjects(){
  const {data} = await supabase.from('subjects').select('*').order('created_at');
  const grid=document.getElementById('subjectsGrid');
  if(!data||data.length===0){ grid.innerHTML='<div class="subject"><b>Namaz</b>Learn 5 prayers</div><div class="subject"><b>Quran</b>Nazra with Tajweed</div><div class="subject"><b>Noorani Qaida</b>Basic Qaida</div><div class="subject"><b>Tarjama</b>Translation</div>'; return; }
  grid.innerHTML = data.map(s=>`<div class="subject"><b>${s.name}</b><small>${s.description}</small>${isAdmin?`<br><button onclick="deleteSubject('${s.id}')">Delete</button>`:''}</div>`).join('');
  document.getElementById('adminSubjects').innerHTML = data.map(s=>`${s.name} - ${s.description} <button onclick="deleteSubject('${s.id}')">Delete</button><br>`).join('');
}
async function addSubject(){
  const name=document.getElementById('newSubjectName').value.trim();
  const desc=document.getElementById('newSubjectDesc').value.trim();
  if(!name) return;
  await supabase.from('subjects').insert([{name, description:desc}]);
  document.getElementById('newSubjectName').value=''; document.getElementById('newSubjectDesc').value='';
  loadSubjects();
}
async function deleteSubject(id){ if(!isAdmin) return; await supabase.from('subjects').delete().eq('id', id); loadSubjects(); }
function editSubjects(){ document.getElementById('admin').scrollIntoView(); navigate('admin'); }

async function loadSchedules(){
  const {data} = await supabase.from('schedules').select('*').order('class_time');
  const list=document.getElementById('scheduleList');
  if(!data||data.length===0){ list.innerHTML='<p>No classes scheduled yet - Qari Saab will add soon. Default: Daily 7PM Noorani Qaida</p>'; return; }
  list.innerHTML = data.map(s=>`<div class="class-item"><div><b>${s.title}</b><br><small>${new Date(s.class_time).toLocaleString()} | Room: ${s.room_name}</small></div><button onclick="joinClassRoom('${s.room_name}','${s.title}')">Join 🎥</button></div>`).join('');
}
async function saveSchedule(){
  const title=document.getElementById('schedTitle').value.trim();
  const time=document.getElementById('schedTime').value;
  const room=document.getElementById('schedLink').value.trim();
  if(!title||!time||!room){ alert('Fill all'); return; }
  await supabase.from('schedules').insert([{title, class_time:time, room_name:room, created_by: currentUser?.id}]);
  document.getElementById('scheduleEditor').style.display='none';
  loadSchedules();
}
function showScheduleEditor(){ document.getElementById('scheduleEditor').style.display='block'; }

async function loadClassListForJoin(){
  const {data} = await supabase.from('schedules').select('*').order('class_time');
  const el=document.getElementById('classListForJoin');
  if(!data||data.length===0){ el.innerHTML='<button onclick="joinClassRoom('DeenSpace-General','General Class')">Join General Class 🎥</button>'; return; }
  el.innerHTML = data.map(s=>`<button style="margin:5px" onclick="joinClassRoom('${s.room_name}','${s.title}')">${s.title} - Join 🎥</button>`).join('');
}

function joinClassRoom(roomName, title){
  document.getElementById('joinPrompt').style.display='none';
  document.getElementById('classroomTitle').textContent = title || roomName;
  const isQari = isAdmin || currentProfile?.role==='teacher';
  canScreenShare = isQari; // Qari only by default
  document.getElementById('roleInfo').textContent = isQari ? 'You are Qari Saab (Moderator - Can Share Screen)' : 'You are Student - Qari can allow your screen share';
  document.getElementById('screenBtn').style.display = isQari ? 'inline-block' : 'none';

  // Jitsi Meet
  const domain = "meet.jit.si";
  const options = {
    roomName: roomName,
    width: '100%',
    height: 600,
    parentNode: document.getElementById('jitsiContainer'),
    configOverwrite: { startWithAudioMuted: !isQari, startWithVideoMuted: false, enableWelcomePage: false },
    interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
    userInfo: { displayName: currentProfile?.full_name || document.getElementById('quickName')?.value || 'Student' }
  };
  if(jitsiAPI) jitsiAPI.dispose();
  jitsiAPI = new JitsiMeetExternalAPI(domain, options);
  jitsiAPI.addListener('videoConferenceJoined', ()=>{ if(isQari) jitsiAPI.executeCommand('toggleLobby', false); });
}

function toggleScreenShare(){
  if(!jitsiAPI) return;
  if(!canScreenShare && !isAdmin){ alert('Only Qari Saab can share. Ask Qari to allow you.'); return; }
  jitsiAPI.executeCommand('toggleShareScreen');
}
function allowStudentScreenShare(){ canScreenShare=true; alert('You allowed student screen share'); }

async function loadContact(){
  const {data} = await supabase.from('contact_info').select('*').limit(1).single();
  const el=document.getElementById('contactInfo');
  if(!data){ el.innerHTML='<p><b>Qari Saab</b><br>Phone: 0300-XXXXXXX<br>Add from Admin Panel</p>'; return; }
  el.innerHTML=`<p><b>${data.qari_name}</b><br>📞 ${data.phone}<br>💬 WhatsApp: ${data.whatsapp}<br>✉️ ${data.email}<br>📍 ${data.address}<br><br>${data.bio}</p>`;
  document.getElementById('waLink').href=`https://wa.me/${data.whatsapp.replace(/[^0-9]/g,'')}`;
  document.getElementById('callLink').href=`tel:${data.phone}`;
}
function editContact(){ document.getElementById('contactEditor').style.display='block'; }
async function saveContact(){
  const payload={ qari_name: document.getElementById('cName').value, phone: document.getElementById('cPhone').value, whatsapp: document.getElementById('cWhatsApp').value, email: document.getElementById('cEmail').value, address: document.getElementById('cAddress').value, bio: document.getElementById('cBio').value };
  await supabase.from('contact_info').upsert([payload]);
  loadContact(); document.getElementById('contactEditor').style.display='none';
}

async function loadAllUsers(){
  if(!isAdmin) return;
  const {data} = await supabase.from('profiles').select('*').order('created_at', {ascending:false});
  const {data:logs} = await supabase.from('join_logs').select('*').order('created_at', {ascending:false}).limit(20);
  const {data:quick} = await supabase.from('quick_joins').select('*').order('created_at', {ascending:false}).limit(20);
  document.getElementById('allUsersList').innerHTML = (data||[]).map(u=>`<div class="user-row"><div><b>${u.full_name}</b><br><small>${u.email} | ${u.phone||''}</small> <span class="badge badge-${u.role}">${u.role}</span></div><select onchange="changeRole('${u.id}', this.value)"><option value="student" ${u.role==='student'?'selected':''}>Student</option><option value="teacher" ${u.role==='teacher'?'selected':''}>Teacher</option><option value="pending_teacher" ${u.role==='pending_teacher'?'selected':''}>Pending Teacher</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></div>`).join('') || 'No users yet';
  document.getElementById('joinLogs').innerHTML = [...(logs||[]), ...(quick||[])].map(l=>`<div style="border-bottom:1px solid #eee;padding:6px"><b>${l.name||l.full_name}</b> - ${l.role} - ${l.phone||l.email} - <small>${new Date(l.created_at).toLocaleString()}</small></div>`).join('') || 'No logs';
}
async function changeRole(userId, newRole){
  if(!isAdmin){ alert('Only Admin can change roles!'); return; }
  await supabase.from('profiles').update({role:newRole}).eq('id', userId);
  alert('Role changed to '+newRole); loadAllUsers();
}
async function logout(){
  await supabase.auth.signOut();
  localStorage.removeItem('deenspace_guest');
  location.reload();
}

// Chat
async function sendChat(){
  const txt=document.getElementById('chatInput').value.trim();
  if(!txt) return;
  const name=currentProfile?.full_name||'Student';
  const div=document.createElement('div'); div.textContent=`${name}: ${txt}`;
  document.getElementById('classChat').appendChild(div);
  document.getElementById('chatInput').value='';
  await supabase.from('class_messages').insert([{room:'general', message:txt, sender_name:name}]);
}
