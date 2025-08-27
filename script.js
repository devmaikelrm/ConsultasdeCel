import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabaseUrl = 'https://dlnqkmcacfwhbwdjxczw.supabase.co';
const supabaseKey = 'TU_CLAVE_ANONIMA';
const supabase = createClient(supabaseUrl, supabaseKey);
export async function login() {
  const email=document.getElementById('email-login').value;
  const password=document.getElementById('password-login').value;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  const status=document.getElementById('login-status');
  if(error){status.innerText=error.message; return;}
  status.innerText='Login exitoso'; window.location.href='index.html';
}
export async function recoverPassword() {
  const email=prompt('Ingresa tu correo electrónico:');
  if(!email)return;
  const {data,error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  alert(error?'Error: '+error.message:'Correo enviado para restablecer contraseña.');
}
export async function addPhone() {
  const commercial_name=document.getElementById('commercial_name').value.trim();
  const model=document.getElementById('model').value.trim();
  const bands=document.getElementById('bands').value.split(',').map(s=>s.trim());
  const provinces=document.getElementById('provinces').value.split(',').map(s=>s.trim());
  const tester=document.getElementById('tester').value.trim();
  const email=document.getElementById('email-tester').value.trim();
  if(!commercial_name||!model||bands.length===0||!email){document.getElementById('addStatus').innerText='Todos los campos obligatorios deben llenarse.';return;}
  const {data,error}=await supabase.from('phones').insert([{commercial_name,model,bands,provinces,tester,email,created_at:new Date()}]);
  document.getElementById('addStatus').innerText=error?'Error: '+error.message:'Teléfono agregado correctamente';
  if(!error){document.getElementById('commercial_name').value='';document.getElementById('model').value='';document.getElementById('bands').value='';document.getElementById('provinces').value='';document.getElementById('tester').value='';document.getElementById('email-tester').value='';}
}
export async function searchPhone() {
  const query=document.getElementById('search').value.trim();
  if(!query)return;
  const {data,error}=await supabase.from('phones').select('*').or(`commercial_name.ilike.%${query}%,model.ilike.%${query}%`);
  const resultsDiv=document.getElementById('results');
  resultsDiv.innerHTML='';
  if(!data||data.length===0){resultsDiv.innerHTML='<p>No se encontró ningún teléfono.</p>'; return;}
  data.forEach(p=>{const div=document.createElement('div');div.className='result-card';div.innerHTML=`<b>${p.commercial_name} (${p.model})</b><br>Bandas: ${p.bands.join(', ')}<br>Provincias: ${p.provinces&&p.provinces.length>0?p.provinces.join(', '):'N/A'}<br>Tester: ${p.tester||'N/A'}<br>Email: ${p.email}`;resultsDiv.appendChild(div);});
}
