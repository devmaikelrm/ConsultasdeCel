// app.js — Supabase (flujo login primero, dashboard protegido)
const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

function escapeHTML(s=''){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

// --- Auth ---
function setupAuth(){
  const loginForm = document.getElementById('login-form');
  if(loginForm){
    const status = loginForm.querySelector('.status');
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){ status.textContent = `Ups: ${error.message}`; status.style.color='tomato'; }
      else {
        status.textContent = `Listo. Bienvenido ${email}`;
        status.style.color='#7CFCB5';
        setTimeout(()=>location.href='dashboard.html', 400);
      }
    });

    // Reset: si hay email en el campo, envía el correo; si no, abre recover.html
    document.getElementById('reset-btn')?.addEventListener('click', async ()=>{
      const emailEl = document.getElementById('email');
      const emailVal = emailEl?.value.trim();
      if(emailVal){
        const redirectTo = (location.origin.startsWith('http')) ? `${location.origin}/login.html` : undefined;
        const { error } = await sb.auth.resetPasswordForEmail(emailVal, { redirectTo });
        if(error){ status.textContent = `Ups: ${error.message}`; status.style.color='tomato'; }
        else { status.textContent = `Enlace de recuperación enviado a: ${emailVal}`; status.style.color='#7CFCB5'; }
      }else{
        location.href = 'recover.html';
      }
    });

    // OAuth: Google y GitHub
    const redirectTo = (location.origin.startsWith('http')) ? `${location.origin}/dashboard.html` : undefined;
    const gBtn = document.getElementById('login-google');
    const ghBtn = document.getElementById('login-github');
    if(gBtn && !gBtn.dataset.bound){
      gBtn.dataset.bound = '1';
      gBtn.addEventListener('click', async ()=>{
        try{ await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }); }
        catch(err){ status.textContent = `Ups: ${err.message||err}`; status.style.color='tomato'; }
      });
    }
    if(ghBtn && !ghBtn.dataset.bound){
      ghBtn.dataset.bound = '1';
      ghBtn.addEventListener('click', async ()=>{
        try{ await sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } }); }
        catch(err){ status.textContent = `Ups: ${err.message||err}`; status.style.color='tomato'; }
      });
    }
  }

  const regForm = document.getElementById('register-form');
  if(regForm){
    regForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-pass').value;
      const status = regForm.querySelector('.status');
      const { error } = await sb.auth.signUp({ email, password });
      if(error){ status.textContent = `Ups: ${error.message}`; status.style.color='tomato'; }
      else { status.textContent = `Listo. Revisa tu correo: ${email}`; status.style.color='#7CFCB5'; regForm.reset(); }
    });
  }

  const recForm = document.getElementById('recover-form');
  if(recForm){
    recForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('recover-email').value.trim();
      const status = recForm.querySelector('.status');
      const redirectTo = (location.origin.startsWith('http')) ? `${location.origin}/login.html` : undefined;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if(error){ status.textContent = `Ups: ${error.message}`; status.style.color='tomato'; }
      else { status.textContent = `Listo. Enlace enviado a: ${email}`; status.style.color='#7CFCB5'; recForm.reset(); }
    });
  }
}

// --- Guard: bloquear páginas protegidas ---
async function guard(){
  const page = document.body?.dataset?.page || '';
  if(page==='subir' || page==='dashboard' || page==='revisar'){
    const { data } = await sb.auth.getSession();
    if(!data.session) location.href = 'login.html';
  }
}

// --- Insertar modelo ---
function setupUpload(){
  const form = document.getElementById('form-subir');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const status = form.querySelector('.status');
    const payload = {
      commercial_name: document.getElementById('commercial_name').value.trim(),
      model:           document.getElementById('model').value.trim(),
      bands:           document.getElementById('bands').value.trim(),
      provinces:       document.getElementById('provinces').value.trim()
    };
    const { error } = await sb.from('phones').insert([payload]);
    if(error){ status.textContent = `Ups: ${error.message}`; status.style.color='tomato'; }
    else { status.textContent = `Listo. Guardado (${escapeHTML(payload.model)})`; status.style.color='#7CFCB5'; form.reset(); }
  });
}

// --- Listar modelos ---
function setupList(){
  const search = document.getElementById('search');
  const results = document.getElementById('results');
  if(!search || !results) return;

  async function load(){
    const { data, error } = await sb.from('phones').select('*');
    if(error){ results.textContent = `Ups: ${error.message}`; return; }
    render(data||[]);
  }
  function render(models){
    const q = (search.value||'').toLowerCase();
    const filtered = models.filter(m => (m.commercial_name||'').toLowerCase().includes(q) || (m.model||'').toLowerCase().includes(q));
    results.innerHTML = filtered.map(m=>`
      <div class="card">
        <b>${escapeHTML(m.commercial_name)} (${escapeHTML(m.model)})</b><br>
        Bandas: ${escapeHTML(m.bands)}<br>
        Provincias: ${escapeHTML(m.provinces || 'N/A')}
      </div>
    `).join('');
  }

  search.addEventListener('input', load);
  load();
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupAuth();
  guard();
  setupUpload();
  setupList();
  setupDashboard?.();
  setupLoginModal?.();
  redirectIndex?.();
});

// --- Dashboard helpers ---
async function setupDashboard(){
  const userEmailSpan = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const profileForm = document.getElementById('profile-form');
  const status = document.querySelector('.status');

  function applyUI(sess){
    if(sess){
      if(userEmailSpan) userEmailSpan.textContent = sess.user?.email || 'Usuario';
      if(logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
      if(userEmailSpan) userEmailSpan.textContent = 'Invitado';
      if(logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  try{
    const { data: { session } } = await sb.auth.getSession();
    applyUI(session);
  }catch{}

  if(logoutBtn && !logoutBtn.dataset.bound){
    logoutBtn.dataset.bound = '1';
    logoutBtn.addEventListener('click', async ()=>{
      try{ await sb.auth.signOut(); }catch{}
      location.href = 'login.html';
    });
  }

  if(profileForm && !profileForm.dataset.bound){
    profileForm.dataset.bound = '1';
    profileForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      try{
        const { data: { user } } = await sb.auth.getUser();
        if(!user){ location.href='login.html'; return; }
        const newEmail = document.getElementById('new-email')?.value.trim();
        const file = document.getElementById('avatar-file')?.files?.[0];
        if(newEmail){
          const { error } = await sb.auth.updateUser({ email: newEmail });
          if(error) throw error;
        }
        if(file){
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${user.id}/avatar.${ext}`;
          await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
          const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
          await sb.auth.updateUser({ data: { avatar_url: pub.publicUrl } });
        }
        if(status){ status.textContent = 'Perfil actualizado'; status.style.color='#7CFCB5'; }
      }catch(err){ if(status){ status.textContent = 'Error: ' + (err.message||err); status.style.color='tomato'; } }
    });
  }

  if(!window.__authBound){
    window.__authBound = true;
    sb.auth.onAuthStateChange((_event, sess)=>{
      applyUI(sess);
    });
  }
}

// --- Modal en login ---
function setupLoginModal(){
  const page = document.body?.dataset?.page || '';
  if(page !== 'login') return;
  const modal = document.getElementById('modal-aviso');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('btn-cerrar-aviso');
  if(!modal || !backdrop) return;
  function open(){ modal.classList.add('open'); backdrop.classList.add('open'); }
  function close(){ modal.classList.remove('open'); backdrop.classList.remove('open'); }
  open();
  closeBtn?.addEventListener('click', close);
  backdrop.addEventListener('click', close);
}

// --- Redirección inicial desde index ---
async function redirectIndex(){
  const page = document.body?.dataset?.page || '';
  if(page !== 'index') return;
  const fallback = setTimeout(()=>{ try{ location.href='login.html'; }catch{} }, 1500);
  try{
    const { data: { session } } = await sb.auth.getSession();
    clearTimeout(fallback);
    if(session) location.href = 'dashboard.html';
    else location.href = 'login.html';
  }catch{
    // usa fallback
  }
}



