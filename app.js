// --- Inicialización Supabase ---
const SUPABASE_URL = 'https://dlnqkmcacfwhbwdjxczw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnFrbWNhY2Z3aGJ3ZGp4Y3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNTUwMTYsImV4cCI6MjA3MTgzMTAxNn0.ytem47gk5X7wVBiT_ke-nudkL9kGWdIR1ScxDcMpWck';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Modal inicial ---
const modal = document.getElementById('modal');
if(modal) setTimeout(()=>modal.style.display='flex',500);
function closeModal(){ modal.style.display='none'; }

// --- Scroll suave para enlaces internos ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// --- Login ---
const loginForm = document.getElementById('login-form');
if(loginForm){
  const status = loginForm.querySelector('.status');
  const signupBtn = document.getElementById('signup-btn');
  const resetBtn = document.getElementById('reset-btn');
  const googleBtn = document.getElementById('google-btn');
  const githubBtn = document.getElementById('github-btn');

  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signInWithPassword({email,password});
    if(error){ status.textContent = `⚠️ ${error.message}`; status.style.color='red'; }
    else{ status.textContent=`✅ Bienvenido ${email}`; status.style.color='green'; loginForm.reset(); }
  });

  signupBtn?.addEventListener('click', ()=>window.location.href="register.html");
  resetBtn?.addEventListener('click', ()=>window.location.href="recover.html");

  googleBtn?.addEventListener('click', async ()=>{
    await supabase.auth.signInWithOAuth({provider:'google'});
  });
  githubBtn?.addEventListener('click', async ()=>{
    await supabase.auth.signInWithOAuth({provider:'github'});
  });
}

// --- Registro ---
const registerForm = document.getElementById('register-form');
if(registerForm){
  registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const status = registerForm.querySelector('.status');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if(error){ status.textContent = `⚠️ ${error.message}`; status.style.color='red'; }
    else{
      status.textContent = `✅ Usuario registrado correctamente con el correo: ${email}`;
      status.style.color='green';
      registerForm.reset();
    }
  });
}

// --- Recuperar contraseña ---
const recoverForm = document.getElementById('recover-form');
if(recoverForm){
  recoverForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('recover-email').value;
    const status = recoverForm.querySelector('.status');
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if(error){ status.textContent = `⚠️ ${error.message}`; status.style.color='red'; }
    else{
      status.textContent = `✅ Se envió un enlace de recuperación al correo: ${email}`;
      status.style.color='green';
      recoverForm.reset();
    }
  });
}

// --- Subir modelo ---
const subirForm = document.getElementById('form-subir');
if(subirForm){
  subirForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const commercial_name = document.getElementById('commercial_name').value;
    const model = document.getElementById('model').value;
    const bands = document.getElementById('bands').value;
    const provinces = document.getElementById('provinces').value;
    const tester = document.getElementById('tester').value;
    const email_tester = document.getElementById('email_tester').value;
    const status = subirForm.querySelector('.status');

    const { data, error } = await supabase.from('phones')
      .insert([{ commercial_name, model, bands, provinces, tester, email_tester }]);
    if(error){ status.textContent=`⚠️ ${error.message}`; status.style.color='red'; }
    else{
      status.textContent = `✅ Modelo guardado correctamente con el correo: ${email_tester}`;
      status.style.color='green';
      subirForm.reset();
    }
  });
}

// --- Revisar modelos ---
const searchInput = document.getElementById('search');
const resultsDiv = document.getElementById('results');
if(searchInput && resultsDiv){
  async function loadModels(){
    const { data, error } = await supabase.from('phones').select('*');
    if(error){ resultsDiv.textContent = `⚠️ ${error.message}`; return; }
    renderModels(data);
  }

  function renderModels(models){
    const filter = searchInput.value.toLowerCase();
    const filtered = models.filter(m=> 
      m.model.toLowerCase().includes(filter) || m.commercial_name.toLowerCase().includes(filter)
    );
    resultsDiv.innerHTML = filtered.map(m=>`
      <div class="card" style="margin-bottom:.6rem; padding:.6rem;">
        <b>${m.commercial_name} (${m.model})</b><br>
        Bandas: ${m.bands}<br>
        Provincias: ${m.provinces || 'N/A'}<br>
        Subido por: ${m.tester || 'Anon'} (${m.email_tester})
      </div>
    `).join('');
  }

  searchInput.addEventListener('input', ()=>loadModels());
  loadModels();
}

