/* ─── register.js ──────────────────────────────────────────────
   Lógica del formulario de registro
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

// ─── Toggle contraseñas ────────────────────────────────────────
setupToggle('toggle-pass',    'password');
setupToggle('toggle-confirm', 'confirm-password');

function setupToggle(btnId, inputId) {
  document.getElementById(btnId).addEventListener('click', function () {
    const input = document.getElementById(inputId);
    const hide  = input.type === 'password';
    input.type  = hide ? 'text' : 'password';
    this.textContent = hide ? '🙈' : '👁';
  });
}

// ─── Medidor de fortaleza de contraseña ───────────────────────
document.getElementById('password').addEventListener('input', function () {
  updateStrength(this.value);
});

function updateStrength(password) {
  const bars  = [1, 2, 3, 4].map(i => document.getElementById(`sb${i}`));
  const label = document.getElementById('strength-label');

  // Limpiar
  bars.forEach(b => { b.className = 'strength-bar'; });

  if (!password) {
    label.textContent = 'Ingresa una contraseña';
    label.style.color = 'var(--text-muted)';
    return;
  }

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const configs = [
    { cls: 'weak',   color: 'var(--error)',   text: 'Muy débil' },
    { cls: 'weak',   color: 'var(--error)',   text: 'Débil' },
    { cls: 'medium', color: 'var(--accent)',  text: 'Aceptable' },
    { cls: 'medium', color: 'var(--accent)',  text: 'Buena' },
    { cls: 'strong', color: 'var(--success)', text: 'Muy fuerte' },
  ];

  const cfg = configs[score];
  for (let i = 0; i < score; i++) bars[i].classList.add(cfg.cls);
  label.textContent  = cfg.text;
  label.style.color  = cfg.color;
}

// ─── Envío del formulario ──────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirm-password').value;
  const btn      = document.getElementById('submit-btn');
  const alertBox = document.getElementById('alert-box');

  clearAlert(alertBox);

  // Validaciones cliente
  if (!name || !email || !password || !confirm) {
    return showAlert(alertBox, 'error', '⚠️ Completa todos los campos.');
  }
  if (name.length < 2) {
    return showAlert(alertBox, 'error', '⚠️ El nombre debe tener al menos 2 caracteres.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showAlert(alertBox, 'error', '⚠️ El email no tiene un formato válido.');
  }
  if (password.length < 6) {
    return showAlert(alertBox, 'error', '⚠️ La contraseña debe tener al menos 6 caracteres.');
  }
  if (password !== confirm) {
    return showAlert(alertBox, 'error', '⚠️ Las contraseñas no coinciden.');
  }

  setLoading(btn, true, 'Creando cuenta...');

  try {
    const res  = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(alertBox, 'error', `❌ ${data.error}`);
      return;
    }

    // Éxito: guardar token y redirigir al dashboard
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));

    showAlert(alertBox, 'success', '✅ <strong>¡Cuenta creada!</strong> Redirigiendo al dashboard...');

    setTimeout(() => {
      window.location.href = 'client-dashboard.html';
    }, 1000);

  } catch {
    showAlert(alertBox, 'error', '❌ No se pudo conectar con el servidor. ¿Está corriendo?');
  } finally {
    setLoading(btn, false, 'Crear Cuenta');
  }
});

// ─── Helpers ───────────────────────────────────────────────────

function showAlert(container, type, msg) {
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      <span>${msg}</span>
    </div>`;
}

function clearAlert(container) { container.innerHTML = ''; }

function setLoading(btn, loading, text) {
  btn.disabled  = loading;
  btn.innerHTML = loading ? `<div class="spinner"></div> ${text}` : text;
}
