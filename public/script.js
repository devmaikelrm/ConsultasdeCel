// --- Scroll suave en enlaces ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// --- Validación de formularios (opt-in) ---
// Activa solo en forms con data-validate="true"
document.querySelectorAll('form[data-validate="true"]').forEach(form => {
  form.addEventListener('submit', e => {
    let valid = true;
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
      if (!input.value.trim()) {
        valid = false;
        input.style.borderColor = 'red';
      } else {
        input.style.borderColor = '';
      }
    });
    if (!valid) e.preventDefault();
  });
});

