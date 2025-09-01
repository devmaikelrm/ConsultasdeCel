// profile.js — editar perfil (nombre, teléfono, provincia, avatar)
(() => {
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  const $ = (s, r=document)=>r.querySelector(s);
  const statusEl = $('.status');

  const TABLES = ['profiles','perfiles']; // probamos ambas
  const COLS_READ = 'id, email, display_name, full_name, nombre, phone, telefono, province, provincia, avatar_url';

  function show(msg,type='ok'){ if(window.showToast) return window.showToast(msg,type); if(statusEl){ statusEl.textContent = msg; } }

  async function getSession(){
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function fetchProfile(uid){
    for(const t of TABLES){
      const { data, error } = await sb.from(t).select(COLS_READ).eq('id', uid).maybeSingle();
      if(!error && data) return { table: t, row: data };
    }
    // si no existe, devolvemos la primera tabla para upsert
    return { table: TABLES[0], row: null };
  }

  function pickName(row){
    return row?.display_name || row?.full_name || row?.nombre || '';
  }
  function pickPhone(row){
    return row?.phone || row?.telefono || '';
  }
  function pickProv(row){
    return row?.province || row?.provincia || '';
  }

  function mapPayload(uid, name, phone, province, avatarUrl){
    return {
      id: uid,
      display_name: name,
      full_name: name,
      nombre: name,
      phone: phone,
      telefono: phone,
      province: province,
      provincia: province,
      avatar_url: avatarUrl || null
    };
  }

  async function uploadAvatar(uid, file){
    const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
    const path = `${uid}/${Date.now()}_avatar.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if(upErr) throw upErr;
    return path; // devolvemos la RUTA (bucket privado)
  }

  async function load(){
    const session = await getSession();
    if(!session){ location.replace('login.html?m=need_login'); return; }
    const uid = session.user.id;

    // Rellenar select de provincias (usa función global si existe)
    if(window.renderProvinciaSelect){
      window.renderProvinciaSelect('#provincia');
    } else {
      const PROVINCIAS = ["Pinar del Río","Artemisa","La Habana","Mayabeque","Matanzas","Cienfuegos","Villa Clara","Sancti Spíritus","Ciego de Ávila","Camagüey","Las Tunas","Holguín","Granma","Santiago de Cuba","Guantánamo","Isla de la Juventud"];
      const sel = $('#provincia'); sel.querySelectorAll("option:not([value=''])").forEach(o=>o.remove());
      PROVINCIAS.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
    }

    // Traer perfil
    const { table, row } = await fetchProfile(uid);

    // Prellenar
    $('#display-name').value = pickName(row);
    $('#phone').value = pickPhone(row);
    const prov = pickProv(row);
    if(prov){ $('#provincia').value = prov; }

    let avatarUrl = row?.avatar_url || '';
    const img = $('#avatar-preview');
    if(avatarUrl){
      if(!/^https?:\/\//.test(avatarUrl)){
        try{
          const { data: signed } = await sb.storage.from('avatars').createSignedUrl(avatarUrl, 60*60*24); // 24h
          avatarUrl = signed?.signedUrl || '';
        }catch{}
      }
    }
    img.src = avatarUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" fill="%230b1020"/><text x="50%" y="52%" fill="%2394a3b8" font-size="18" text-anchor="middle" font-family="system-ui">Sin foto</text></svg>';

    // Eventos
    $('#avatar-file').addEventListener('change', (e)=>{
      const f = e.target.files?.[0];
      if(!f) return;
      const url = URL.createObjectURL(f);
      img.src = url;
    });

    $('#logout-btn')?.addEventListener('click', async ()=>{
      await sb.auth.signOut();
      location.replace('login.html?m=signed_out');
    });

    $('#profile-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = $('#display-name').value.trim();
      const phone = $('#phone').value.trim();
      const province = $('#provincia').value;

      if(!name){ $('#name-hint').textContent='Ingresa tu nombre.'; return; }
      if(!province){ $('#prov-hint').textContent='Selecciona tu provincia.'; return; }

      $('#save-btn').disabled = true;
      $('#save-btn').textContent = 'Guardando…';

      try{
        let newAvatarUrl = row?.avatar_url || null;
        const file = $('#avatar-file').files?.[0];
        if(file){
          newAvatarUrl = await uploadAvatar(uid, file);
        }

        const payload = mapPayload(uid, name, phone, province, newAvatarUrl); // avatar_url guarda la RUTA en bucket privado
        const { table: t } = await fetchProfile(uid); // reusa tabla detectada
        const { error } = await sb.from(t).upsert(payload, { onConflict: 'id' });
        if(error) throw error;

        show('Perfil actualizado', 'ok');
        // Actualiza row local
        if(payload.avatar_url) img.src = payload.avatar_url;
      }catch(err){
        console.error(err);
        show('No se pudo guardar el perfil', 'err');
      }finally{
        $('#save-btn').disabled = false;
        $('#save-btn').textContent = 'Guardar cambios';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', load);
})();
