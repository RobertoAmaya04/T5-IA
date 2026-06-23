/* ─── login.js ─────────────────────────────────────────────────
   Lógica del formulario de inicio de sesión
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

// ─── Redirigir si ya hay sesión ────────────────────────────────
if (localStorage.getItem('authToken')) {
  const cachedUser = localStorage.getItem('authUser');
  if (cachedUser) {
    const user = JSON.parse(cachedUser);
    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'client-dashboard.html';
    }
  } else {
    window.location.href = 'client-dashboard.html';
  }
}

// ─── Toggle visibilidad de contraseña ─────────────────────────
document.getElementById('toggle-pass').addEventListener('click', function () {
  const input = document.getElementById('password');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  this.textContent = isHidden ? '🙈' : '👁';
});

// ─── Envío del formulario ──────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('submit-btn');
  const alertBox = document.getElementById('alert-box');

  clearAlert(alertBox);

  // Validación básica del lado cliente
  if (!email || !password) {
    return showAlert(alertBox, 'error', '⚠️ Completa todos los campos.');
  }

  setLoading(btn, true, 'Verificando...');

  try {
    const res  = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(alertBox, 'error', `❌ ${data.error}`);
      return;
    }

    // Guardar sesión
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));

    showAlert(alertBox, 'success', '✅ ¡Sesión iniciada! Redirigiendo...');

    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'client-dashboard.html';
      }
    }, 900);

  } catch {
    showAlert(alertBox, 'error', '❌ No se pudo conectar con el servidor. ¿Está corriendo?');
  } finally {
    setLoading(btn, false, 'Entrar');
  }
});

// ─── Helpers ───────────────────────────────────────────────────

function showAlert(container, type, msg) {
  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      <span class="alert-icon">${icons[type] ?? 'ℹ️'}</span>
      <span>${msg}</span>
    </div>`;
}

function clearAlert(container) {
  container.innerHTML = '';
}

function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<div class="spinner"></div> ${text}`
    : text;
}
