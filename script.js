// --- Scroll suave en enlaces ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// --- Buscador en vivo en revisar.html ---
const searchInput = document.querySelector(".search");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll(".tabla tbody tr");
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? "" : "none";
    });
  });
}

// --- Validación de formularios ---
const forms = document.querySelectorAll("form");
forms.forEach(form => {
  form.addEventListener("submit", e => {
    let valid = true;
    const inputs = form.querySelectorAll("input[required], textarea[required]");
    inputs.forEach(input => {
      if (!input.value.trim()) {
        valid = false;
        input.style.borderColor = "red";
      } else {
        input.style.borderColor = "#ccc";
      }
    });

    if (!valid) {
      e.preventDefault();
      alert("⚠️ Por favor, completa todos los campos obligatorios.");
    } else {
      alert("✅ ¡Formulario enviado con éxito!");
    }
  });
});
