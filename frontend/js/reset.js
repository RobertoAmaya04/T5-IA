/* ─── reset.js ─────────────────────────────────────────────────
   Lógica para restablecer contraseña con token
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

// ─── Leer token de la URL ──────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const token  = params.get('token');
const alertBox    = document.getElementById('alert-box');
const formSection = document.getElementById('form-section');

if (!token) {
  formSection.style.display = 'none';
  showAlert(alertBox, 'error',
    '⛔ Este link no contiene un token válido. Solicita un nuevo link de recuperación.');
} else {
  document.getElementById('reset-token').value = token;
}

// ─── Toggle visibilidad ────────────────────────────────────────
setupToggle('toggle-new',     'new-password');
setupToggle('toggle-confirm', 'confirm-password');

function setupToggle(btnId, inputId) {
  document.getElementById(btnId).addEventListener('click', function () {
    const input = document.getElementById(inputId);
    const hide  = input.type === 'password';
    input.type  = hide ? 'text' : 'password';
    this.textContent = hide ? '🙈' : '👁';
  });
}

// ─── Medidor de fortaleza ──────────────────────────────────────
document.getElementById('new-password').addEventListener('input', function () {
  updateStrength(this.value);
});

function updateStrength(password) {
  const bars  = [1, 2, 3, 4].map(i => document.getElementById(`sb${i}`));
  const label = document.getElementById('strength-label');
  bars.forEach(b => { b.className = 'strength-bar'; });

  if (!password) {
    label.textContent  = 'Ingresa una contraseña';
    label.style.color  = 'var(--text-muted)';
    return;
  }

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const cfgs = [
    { cls: 'weak',   color: 'var(--error)',   text: 'Muy débil' },
    { cls: 'weak',   color: 'var(--error)',   text: 'Débil' },
    { cls: 'medium', color: 'var(--accent)',  text: 'Aceptable' },
    { cls: 'medium', color: 'var(--accent)',  text: 'Buena' },
    { cls: 'strong', color: 'var(--success)', text: 'Muy fuerte' },
  ];
  const cfg = cfgs[score];
  for (let i = 0; i < score; i++) bars[i].classList.add(cfg.cls);
  label.textContent = cfg.text;
  label.style.color = cfg.color;
}

// ─── Envío del formulario ──────────────────────────────────────
document.getElementById('reset-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirm     = document.getElementById('confirm-password').value;
  const resetToken  = document.getElementById('reset-token').value;
  const btn         = document.getElementById('submit-btn');

  clearAlert(alertBox);

  if (!newPassword || !confirm) {
    return showAlert(alertBox, 'error', '⚠️ Completa ambos campos.');
  }
  if (newPassword.length < 6) {
    return showAlert(alertBox, 'error', '⚠️ La contraseña debe tener al menos 6 caracteres.');
  }
  if (newPassword !== confirm) {
    return showAlert(alertBox, 'error', '⚠️ Las contraseñas no coinciden.');
  }

  setLoading(btn, true, 'Actualizando...');

  try {
    const res  = await fetch(`${API}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(alertBox, 'error', `❌ ${data.error}`);
      if (data.expired) {
        formSection.style.display = 'none';
        const footer = document.querySelector('.form-footer');
        if (footer) footer.innerHTML = '<a href="forgot.html" class="btn btn-ghost" style="margin-top:1rem;">Solicitar nuevo link</a>';
      }
      return;
    }

    // Éxito
    formSection.style.display = 'none';
    document.getElementById('success-section').style.display = 'block';

  } catch {
    showAlert(alertBox, 'error', '❌ No se pudo conectar con el servidor.');
  } finally {
    setLoading(btn, false, 'Restablecer Contraseña');
  }
});

// ─── Helpers ───────────────────────────────────────────────────

function showAlert(container, type, msg) {
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      <span class="alert-icon">${type === 'error' ? '⚠️' : '✅'}</span>
      <span>${msg}</span>
    </div>`;
}

function clearAlert(container) { container.innerHTML = ''; }

function setLoading(btn, loading, text) {
  btn.disabled  = loading;
  btn.innerHTML = loading ? `<div class="spinner"></div> ${text}` : text;
}
