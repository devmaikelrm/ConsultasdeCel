// ==========================
//  CONFIGURACIÓN SUPABASE
// ==========================
const SUPABASE_URL = "https://dlnqkmcacfwhbwdjxczw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnFrbWNhY2Z3aGJ3ZGp4Y3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNTUwMTYsImV4cCI6MjA3MTgzMTAxNn0.ytem47gk5X7wVBiT_ke-nudkL9kGWdIR1ScxDcMpWck";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
//  LOGIN / REGISTRO
// ==========================
const loginForm = document.querySelector("#login-form");
const logoutBtn = document.querySelector("#logout-btn");
const googleBtn = document.querySelector("#google-login");
const githubBtn = document.querySelector("#github-login");

// --- Iniciar sesión ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#usuario").value.trim();
    const password = document.querySelector("#password").value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("⚠️ Error al iniciar sesión: " + error.message);
    } else {
      alert("✅ Sesión iniciada");
      window.location.href = "dashboard.html";
    }
  });
}

// --- Registro de usuario ---
const registerForm = document.querySelector("#register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#reg-email").value.trim();
    const password = document.querySelector("#reg-pass").value.trim();

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("⚠️ Error al registrarse: " + error.message);
    } else {
      alert("✅ Registro exitoso, revisa tu correo para confirmar");
    }
  });
}

// --- Login con Google ---
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  });
}

// --- Login con GitHub ---
if (githubBtn) {
  githubBtn.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({ provider: "github" });
  });
}

// --- Logout ---
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

// ==========================
//  SUBIR MODELOS
// ==========================
const subirForm = document.querySelector("#subir-form");

if (subirForm) {
  subirForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const modelo = document.querySelector("#modelo").value.trim();
    const bandas = document.querySelector("#bandas").value.trim();
    const archivo = document.querySelector("#archivo").files[0];

    // Obtenemos el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("⚠️ Debes iniciar sesión para subir modelos");
      return;
    }

    let imagen_url = null;

    // Subir imagen a Supabase Storage si existe
    if (archivo) {
      const { data: imgData, error: imgError } = await supabase
        .storage
        .from("imagenes")
        .upload(`modelos/${Date.now()}_${archivo.name}`, archivo);

      if (imgError) {
        alert("⚠️ Error al subir la imagen");
        return;
      }

      imagen_url = `${SUPABASE_URL}/storage/v1/object/public/imagenes/${imgData.path}`;
    }

    // Insertar modelo en la base de datos
    const { error } = await supabase.from("modelos").insert([{
      modelo,
      bandas,
      imagen_url,
      subido_por: user.id
    }]);

    if (error) {
      alert("⚠️ Error al subir modelo: " + error.message);
    } else {
      alert("✅ Modelo subido correctamente");
      subirForm.reset();
    }
  });
}

// ==========================
//  MOSTRAR MODELOS
// ==========================
const tablaModelos = document.querySelector("#tabla-modelos");

async function cargarModelos() {
  if (!tablaModelos) return;

  const { data: modelos, error } = await supabase
    .from("modelos")
    .select(`
      modelo,
      bandas,
      imagen_url,
      subido_por
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando modelos:", error);
    return;
  }

  tablaModelos.innerHTML = "";
  modelos.forEach(m => {
    const fila = `
      <tr>
        <td>${m.modelo}</td>
        <td>${m.bandas}</td>
        <td>${m.imagen_url ? `<a href="${m.imagen_url}" target="_blank">📷 Ver</a>` : "Sin imagen"}</td>
        <td>${m.subido_por}</td>
      </tr>
    `;
    tablaModelos.innerHTML += fila;
  });
}

cargarModelos();
