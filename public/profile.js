// profile.js — gestión de perfil con Supabase
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
const $ = (s, r=document)=> r.querySelector(s);

async function getUserOrRedirect(){
  const { data: { session } } = await sb.auth.getSession();
  if(!session){ location.replace('login.html'); throw new Error('no-session'); }
  return session.user;
}

async function createSigned(path){
  try{ const { data } = await sb.storage.from('avatars').createSignedUrl(path, 3600); return data?.signedUrl; }catch{ return null }
}

async function resizeImageSquare(file, size=128, type='image/webp', quality=0.9){
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej)=>{ img.onload=()=>res(); img.onerror=rej; img.src=url; });
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide)/2, sy = (img.height - minSide)/2;
  const c = document.createElement('canvas'); c.width=size; c.height=size;
  const ctx = c.getContext('2d'); ctx.drawImage(img, sx, sy, minSide, minSide, 0,0,size,size);
  const blob = await new Promise(r=> c.toBlob(r, type, quality));
  URL.revokeObjectURL(url); return blob || file;
}

async function uploadAvatar(uid, file){
  const blob = await resizeImageSquare(file,128,'image/webp',0.9);
  const path = `${uid}/avatar.webp`;
  const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert:true, contentType:'image/webp' });
  if(error) throw error; return path;
}

function fillSelectProvince(sel, value){
  // ya está en HTML; solo seleccionar si coincide
  if(value){ Array.from(sel.options).forEach(o=>{ if(o.value===value) sel.value=value; }); }
}

async function loadProfile(){
  const user = await getUserOrRedirect();
  $('#nav-email').textContent = user.email || '';
  const avatar = $('#avatar-preview');
  try{
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if(!error && data){
      $('#full-name').value = data.full_name || '';
      $('#phone').value = data.phone || '';
      fillSelectProvince($('#province'), data.province||'');
      if(data.avatar_url){ const url = await createSigned(data.avatar_url); if(url) avatar.src = url; }
    } else {
      avatar.src = '';
    }
  }catch{}
}

function setupAvatar(){
  const fileInput = $('#avatar-file');
  const preview = $('#avatar-preview');
  $('#btn-upload').addEventListener('click', ()=> fileInput?.click());
  fileInput?.addEventListener('change', async ()=>{
    const f = fileInput.files?.[0]; if(!f) return;
    try{ const blob = await resizeImageSquare(f,128,'image/webp',0.9); const url = URL.createObjectURL(blob); preview.src=url; setTimeout(()=>URL.revokeObjectURL(url),3000);}catch{}
  });
}

function validate(){
  let ok = true;
  const emailEl = $('#nav-email'); // visual
  const nameEl = $('#full-name'); const errName = $('#err-name'); errName.textContent='';
  const phoneEl = $('#phone'); const errPhone = $('#err-phone'); errPhone.textContent='';
  const provEl = $('#province'); const errProv = $('#err-province'); errProv.textContent='';
  if(provEl.value===''){ errProv.textContent = 'Selecciona una provincia'; ok=false; }
  if(phoneEl.value && !/^\+?\d{6,15}$/.test(phoneEl.value.trim())){ errPhone.textContent='Teléfono inválido'; ok=false; }
  if(nameEl.value && nameEl.value.length>80){ errName.textContent='Nombre demasiado largo'; ok=false; }
  return ok;
}

async function saveProfile(e){
  e.preventDefault(); if(!validate()) return;
  const status = $('.status'); status.textContent='Guardando…';
  try{
    const { data: { user } } = await sb.auth.getUser(); if(!user) throw new Error('Sin sesión');
    let avatarPath = undefined;
    const file = $('#avatar-file').files?.[0];
    if(file){ avatarPath = await uploadAvatar(user.id, file); }
    const payload = {
      id: user.id,
      full_name: $('#full-name').value.trim()||null,
      phone: $('#phone').value.trim()||null,
      province: $('#province').value||null,
    };
    if(avatarPath) payload.avatar_url = avatarPath;
    const { error } = await sb.from('profiles').upsert(payload, { onConflict:'id' });
    if(error) throw error;
    status.textContent='Listo. Perfil actualizado';
  }catch(err){ status.textContent = 'Ups: ' + (err?.message||err); }
}

async function main(){
  $('#btn-logout').addEventListener('click', async ()=>{ try{ await sb.auth.signOut(); }catch{} location.replace('login.html'); });
  setupAvatar();
  await loadProfile();
  $('#profile-form').addEventListener('submit', saveProfile);
}

document.addEventListener('DOMContentLoaded', main);
