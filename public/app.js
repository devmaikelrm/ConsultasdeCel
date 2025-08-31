// app.js â€” rutas claras + UI dinÃ¡mica (sin CSV)
// Requiere: config.js (SUPABASE_URL, SUPABASE_KEY)
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
// Base URL (soportar GitHub Pages en subcarpeta)
const BASE_URL = (()=>{
  try{
    const { origin, pathname } = location;
    const base = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^\/]*$/, '/');
    return origin + base;
  }catch{ return ''; }
})();

// --- Toasts ---
function showToast(msg, type='ok'){
  let wrap = document.querySelector('.toast-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='err'?'toast-err':'toast-ok');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>{ t.classList.add('show'); }, 20);
  setTimeout(()=>{ t.classList.remove('show'); t.addEventListener('transitionend', ()=>t.remove(), {once:true}); }, 3200);
}

// --- Avatar helpers ---
async function getAvatarUrl(uid){
  try{
    const { data, error } = await sb.storage.from('avatars').list(`${uid}`, { limit: 10 });
    if(error) return null;
    const file = (data||[]).find(f=>/^avatar\.(png|jpg|jpeg|webp|gif)$/i.test(f.name));
    if(!file) return null;
    const path = `${uid}/${file.name}`;
    const { data: signed } = await sb.storage.from('avatars').createSignedUrl(path, 3600);
    return signed?.signedUrl || null;
  }catch(_e){ return null; }
}

async function uploadAvatar(uid, file){
  const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
  const path = `${uid}/avatar.${ext}`;
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if(error) throw error;
  return path;
}

async function getSession(){ const { data } = await sb.auth.getSession(); return data?.session || null; }
function reveal(){ document.documentElement.style.visibility='visible'; document.body.style.visibility='visible'; }

async function guardRoutes(){
  const page = document.body.dataset.page || 'index';
  const session = await getSession();
  const isAuth = !!session;
  const protectedPages = new Set(['dashboard','subir','revisar']);
  const publicOnly = new Set(['login','register','recover']);

  if(page==='index'){
    window.location.href = isAuth ? 'dashboard.html' : 'login.html';
    return;
  }
  if(protectedPages.has(page) && !isAuth){ window.location.replace('login.html'); return; }
  if(publicOnly.has(page) && isAuth){ window.location.replace('dashboard.html'); return; }

  setupNav(isAuth, session);
  if(page==='login'){ toggleLoginPanels(true); setupLogin(); }
  if(page==='dashboard') setupDashboard();
  if(page==='subir') setupSubir();
  if(page==='revisar') setupList();
  if(page==='recover') setupRecover();
  if(page==='change') setupChange();
  if(page==='register') setupRegister();
  setupIntroModal();
  reveal();
}

// Navbar reactiva
function setupNav(isAuth, session){
  $$('.only-auth').forEach(el=> el.style.display = isAuth ? '' : 'none');
  $$('.only-anon').forEach(el=> el.style.display = isAuth ? 'none' : '');
  $$('.user-email').forEach(el=> el.textContent = isAuth ? (session.user.email||'') : '');
  $$('.btn-logout').forEach(btn=> btn.addEventListener('click', async ()=>{
    const ok = confirm('Â¿Seguro que quieres cerrar sesiÃ³n?');
    if(!ok) return;
    try{ await sb.auth.signOut(); }catch{}
    window.location.replace('login.html');
  }));
  $$('.btn-back').forEach(btn=> btn.addEventListener('click', ()=>{
    try{
      if(history.length > 1) history.back(); else window.location.href = 'index.html';
    }catch{ window.location.href = 'index.html'; }
  }));
}

// Login (email/password + OAuth)
function toggleLoginPanels(showForm=true){
  const splash = document.getElementById('login-check');
  const panel = document.getElementById('login-panel');
  if(splash) splash.style.display = showForm ? 'none' : '';
  if(panel) panel.classList.toggle('hidden', !showForm);
}
function setupLogin(){
  const form = $('#login-form');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = form.querySelector('input[type=email]').value.trim();
      const pass = form.querySelector('input[type=password]').value;
      const btn = form.querySelector('button[type=submit]');
      const status = form.querySelector('.form-status');
      btn.disabled = true; status.textContent = 'Ingresandoâ€¦';
      try{
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if(error) throw error;
        window.location.replace('dashboard.html');
      }catch(err){
        status.textContent = 'Error: ' + (err?.message || err);
      }finally{
        btn.disabled = false;
      }
    });
  }
  const redirectTo = BASE_URL + 'dashboard.html';
  $('#login-google')?.addEventListener('click', async ()=>{ await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } }); });
  $('#login-github')?.addEventListener('click', async ()=>{ await sb.auth.signInWithOAuth({ provider:'github', options:{ redirectTo } }); });
  // Recuperar contraseÃ±a: si hay email, envÃ­a enlace; si no, ir a recover.html
  $('#reset-btn')?.addEventListener('click', async ()=>{
    const emailEl = document.getElementById('email');
    const emailVal = emailEl?.value.trim();
    const status = form?.querySelector('.status');
    try{
      if(emailVal){
        const opts = {};
        if(String(location.origin||'').startsWith('http')) opts.redirectTo = BASE_URL + 'change.html';
        const { error } = await sb.auth.resetPasswordForEmail(emailVal, opts);
        if(error) throw error;
        if(status) status.textContent = `Enlace de recuperaciÃ³n enviado a: ${emailVal}`;
        showToast('Enlace de recuperaciÃ³n enviado', 'ok');
      } else {
        window.location.href = 'recover.html';
      }
    }catch(err){
      if(status) status.textContent = 'Ups: ' + (err?.message||err);
      showToast('No se pudo enviar: ' + (err?.message||err), 'err');
    }
  });

  // Si viene con indicador de cambio completado, mostrar mensaje
  try{
    const usp = new URLSearchParams(location.search);
    if(usp.get('changed')==='1'){
      const status = form?.querySelector('.status');
      if(status) status.textContent = 'ContraseÃ±a actualizada. Inicia sesiÃ³n.';
      showToast('ContraseÃ±a actualizada', 'ok');
    }
  }catch{}

  // Si viene de un enlace de recuperaciÃ³n (#type=recovery en URL), mostrar mensaje y limpiar hash
  if(/type=recovery/.test(location.hash||'')){
    const status = form?.querySelector('.status');
    if(status) status.textContent = 'Tu contraseÃ±a fue restablecida. Inicia sesiÃ³n.';
    showToast('Tu contraseÃ±a fue restablecida', 'ok');
    try{ history.replaceState(null,'', location.pathname + location.search); }catch{}
  }
}

// Recuperar contraseÃ±a (recover.html)
function setupRecover(){
  const form = document.getElementById('recover-form');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('recover-email')?.value.trim();
    const status = form.querySelector('.status');
    try{
      const opts = {};
      if(String(location.origin||'').startsWith('http')) opts.redirectTo = BASE_URL + 'change.html';
      const { error } = await sb.auth.resetPasswordForEmail(email, opts);
      if(error) throw error;
      if(status) status.textContent = `Listo. Enlace enviado a: ${email}`;
      showToast('Enlace de recuperaciÃ³n enviado', 'ok');
      form.reset();
    }catch(err){
      if(status) status.textContent = 'Ups: ' + (err?.message||err);
      showToast('No se pudo enviar: ' + (err?.message||err), 'err');
    }
  });
}

// Intro modal (aviso de propÃ³sito y limitaciones)
async function setupIntroModal(){
  const modal = document.getElementById('modal-aviso');
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('btn-cerrar-aviso');
  const openBtn = document.getElementById('btn-open-aviso');
  if(!modal || !backdrop) return;
  const open = ()=>{ modal.classList.add('open'); backdrop.classList.add('open'); };
  const close = ()=>{ modal.classList.remove('open'); backdrop.classList.remove('open'); };

  const page = (document.body.dataset.page||'').toLowerCase();
  const seenKey = 'intro_seen_v1';
  let seen = localStorage.getItem(seenKey) === '1';
  // Intentar leer preferencia por usuario (user_metadata)
  try{
    const { data: { user } } = await sb.auth.getUser();
    if(user && user.user_metadata && user.user_metadata[seenKey] === true){
      seen = true;
    }
  }catch{}

  // Abrir automÃ¡ticamente SOLO en login y solo una vez (por navegador)
  // Casos que fuerzan apertura: ?aviso=1 o #aviso, o al venir de registro (?registered=1)
  try{
    const usp = new URLSearchParams(location.search);
    const force = usp.get('aviso') === '1' || usp.get('registered') === '1' || /(^|#)aviso(=1)?/.test(location.hash||'');
    if(force || (page==='login' && !seen)) open();
  }catch{
    if(page==='login' && !seen) open();
  }

  const markSeen = async ()=>{
    try{ localStorage.setItem(seenKey,'1'); }catch{}
    // Persistir en user_metadata si hay sesiÃ³n
    try{
      const { data: { user } } = await sb.auth.getUser();
      if(user){ await sb.auth.updateUser({ data: { [seenKey]: true } }); }
    }catch{}
  };
  closeBtn?.addEventListener('click', ()=>{ markSeen(); close(); });
  backdrop?.addEventListener('click', ()=>{ markSeen(); close(); });
  openBtn?.addEventListener('click', (e)=>{ e.preventDefault?.(); open(); });
}

function escapeHTML(s=''){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

// Listado y bÃºsqueda (revisar.html)
function setupList(){
  const search = document.getElementById('search');
  const results = document.getElementById('results');
  if(!search || !results) return;
  let modelsCache = [];

  async function load(){
    const { data, error } = await sb.from('phones').select('*');
    if(error){ results.textContent = `Ups: ${error.message}`; return; }
    modelsCache = data || [];
    render();
  }
  function render(){
    const q = (search.value||'').toLowerCase();
    const filtered = modelsCache.filter(m => (m.commercial_name||'').toLowerCase().includes(q) || (m.model||'').toLowerCase().includes(q));
    results.innerHTML = filtered.map(m=>`
      <div class="card">
        <b>${escapeHTML(m.commercial_name||'Nombre')}</b> (${escapeHTML(m.model||'Modelo')})<br>
        Bandas: ${escapeHTML(m.bands||'N/A')}<br>
        Provincias: ${escapeHTML(m.provinces||'N/A')}
      </div>
    `).join('');
  }

  search.addEventListener('input', render);
  load();
}

// Dashboard (protegido)
function setupDashboard(){
  const form = $('#profile-form');
  const avatarImg = $('#avatar-img');
  const fileInput = $('#avatar-file');
  (async ()=>{
    try{
      const { data: sess } = await sb.auth.getSession();
      const uid = sess?.session?.user?.id;
      if(uid && avatarImg){
        const url = await getAvatarUrl(uid);
        if(url) avatarImg.src = url;
      }
    }catch(_e){}
  })();

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const newEmail = $('#new-email')?.value?.trim();
      const status = form.querySelector('.status');
      status.textContent = 'Guardandoâ€¦';
      try{
        if(newEmail){
          const { error } = await sb.auth.updateUser({ email: newEmail }, { emailRedirectTo: BASE_URL + 'dashboard.html' });
          if(error) throw error;
        }
        const f = fileInput?.files?.[0];
        if(f){
          const { data: sess } = await sb.auth.getSession();
          const uid = sess?.session?.user?.id;
          if(uid){
            await uploadAvatar(uid, f);
            const url = await getAvatarUrl(uid);
            if(url && avatarImg){ avatarImg.src = url; }
          }
        }
        status.textContent = 'Listo. Cambios guardados';
        showToast('Cambios guardados', 'ok');
      }catch(err){
        status.textContent = 'Upsâ€¦ ' + (err?.message || err);
        showToast('No se pudo guardar: ' + (err?.message||err), 'err');
      }
    });
  }
}

// Subir modelo: inserta en Supabase (tabla public.phones)
function setupSubir(){
  const form = document.querySelector('#form-subir');
  if(!form) return;
  const status = form.querySelector('.status');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const commercial_name = document.getElementById('commercial_name')?.value?.trim();
    const model = document.getElementById('model')?.value?.trim();
    const bands = document.getElementById('bands')?.value?.trim();
    const provinces = document.getElementById('province')?.value?.trim();
    if(!commercial_name || !model || !bands){
      status.textContent = 'Faltan campos obligatorios';
      showToast('Completa los campos obligatorios', 'err');
      return;
    }
    status.textContent = 'Guardandoâ€¦';
    try{
      const payload = { commercial_name, model, bands, provinces: provinces || null };
      const { error } = await sb.from('phones').insert([payload]);
      if(error) throw error;
      status.textContent = `Listo. Guardado (${model})`;
      showToast('Modelo guardado', 'ok');
      form.reset();
    }catch(err){
      status.textContent = 'Ups: ' + (err?.message||err);
      showToast('No se pudo guardar: ' + (err?.message||err), 'err');
    }
  });
}

// Evitar FOUC en protegidas
(function preventFOUC(){
  const page = (document.body.dataset.page||'').toLowerCase();
  if(['dashboard','subir'].includes(page)){
    document.documentElement.style.visibility='hidden';
    document.body.style.visibility='hidden';
  }
})();

document.addEventListener('DOMContentLoaded', guardRoutes);
sb.auth.onAuthStateChange((_e, session)=>{
  const page = document.body.dataset.page || 'index';
  const isProtected = ['dashboard','subir','revisar'].includes(page);
  if(isProtected && !session) window.location.replace('login.html');
  if(['login','register','recover'].includes(page) && session) window.location.replace('dashboard.html');
});

// Registro (register.html)
function setupRegister(){
  const form = document.getElementById('register-form');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-pass')?.value;
    const status = form.querySelector('.status');
    try{
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: BASE_URL + 'dashboard.html' } });
      if(error) throw error;
      if(status) status.textContent = `Listo. Revisa tu correo: ${email}`;
      showToast('Registro creado. Revisa tu correo', 'ok');
      form.reset();
      // Tras registro, enviar al login y forzar el aviso una sola vez
      setTimeout(()=>{ window.location.replace('login.html?registered=1'); }, 800);
    }catch(err){
      if(status) status.textContent = 'Ups: ' + (err?.message||err);
      showToast('No se pudo registrar: ' + (err?.message||err), 'err');
    }
  });
}

// PÃ¡gina de cambio de contraseÃ±a (change.html)
function setupChange(){
  const form = document.getElementById('change-form');
  if(!form) return;
  const pass1 = document.getElementById('new-pass');
  const pass2 = document.getElementById('confirm-pass');
  const status = form.querySelector('.status');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const p1 = pass1?.value || '';
    const p2 = pass2?.value || '';
    if(p1.length < 6){ status.textContent = 'La contraseÃ±a debe tener al menos 6 caracteres'; return; }
    if(p1 !== p2){ status.textContent = 'Las contraseÃ±as no coinciden'; return; }
    try{
      const { data: { session } } = await sb.auth.getSession();
      if(!session){ window.location.replace('login.html'); return; }
      const { error } = await sb.auth.updateUser({ password: p1 });
      if(error) throw error;
      showToast('ContraseÃ±a actualizada', 'ok');
      try{ await sb.auth.signOut(); }catch{}
      window.location.replace('login.html?changed=1');
    }catch(err){
      status.textContent = 'Ups: ' + (err?.message||err);
      showToast('No se pudo actualizar: ' + (err?.message||err), 'err');
    }
  });
}







