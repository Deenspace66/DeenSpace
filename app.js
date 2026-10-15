
// FIXED APP.JS - Register bug fixed
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');

function showLogin(){
  loginForm.style.display='block';
  registerForm.style.display='none';
  document.getElementById('loginTab').classList.add('active');
  document.getElementById('registerTab').classList.remove('active');
}
function showRegister(){
  registerForm.style.display='block';
  loginForm.style.display='none';
  document.getElementById('registerTab').classList.add('active');
  document.getElementById('loginTab').classList.remove('active');
}

// Check session on load
(async ()=>{
  const {data:{session}} = await supabase.auth.getSession();
  if(session) showDashboard(session.user);
})();

// LOGIN
loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMessage');
  msg.textContent='Logging in...';
  msg.className='';
  
  const {data, error} = await supabase.auth.signInWithPassword({email,password});
  if(error){
    msg.textContent = error.message;
    msg.className='error';
  } else {
    msg.textContent='Success!';
    msg.className='success';
    showDashboard(data.user);
  }
});

// REGISTER - FIXED VERSION
registerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  const role = document.getElementById('registerRole').value;
  const msg = document.getElementById('registerMessage');
  
  if(password !== confirm){
    msg.textContent='Passwords do not match!';
    msg.className='error';
    return;
  }
  if(password.length < 6){
    msg.textContent='Password must be at least 6 characters';
    msg.className='error';
    return;
  }
  if(!role){
    msg.textContent='Please select a role';
    msg.className='error';
    return;
  }

  msg.textContent='Creating account...';
  msg.className='';

  // 1. Create auth user
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options:{data:{full_name:name, role:role}}
  });

  if(error){
    msg.textContent = error.message;
    msg.className='error';
    console.error(error);
    return;
  }

  // 2. Insert into profiles table (if you created it)
  if(data.user){
    const {error:profileError} = await supabase.from('profiles').insert([{
      id: data.user.id,
      full_name: name,
      email: email,
      role: role
    }]);
    if(profileError) console.log('Profile insert:', profileError.message);
  }

  msg.textContent='Account created! Check email to confirm, then Login.';
  msg.className='success';
  setTimeout(()=>showLogin(),2000);
});

async function showDashboard(user){
  authSection.style.display='none';
  dashboard.style.display='block';
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userName').textContent = user.user_metadata?.full_name || user.email.split('@')[0];
  document.getElementById('userRole').textContent = user.user_metadata?.role || 'student';
  
  // Get profile from table
  const {data} = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if(data){
    document.getElementById('userName').textContent = data.full_name;
    document.getElementById('userRole').textContent = data.role;
  }
}

async function logout(){
  await supabase.auth.signOut();
  authSection.style.display='block';
  dashboard.style.display='none';
  loginForm.reset();
  registerForm.reset();
}
