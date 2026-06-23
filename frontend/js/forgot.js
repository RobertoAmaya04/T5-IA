/* ─── forgot.js ────────────────────────────────────────────────
   Lógica para recuperar usuario o contraseña
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

document.getElementById('forgot-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const type     = document.querySelector('input[name="recovery-type"]:checked').value;
  const btn      = document.getElementById('submit-btn');
  const alertBox = document.getElementById('alert-box');

  clearAlert(alertBox);

  if (!email) {
    return showAlert(alertBox, 'error', '⚠️ Ingresa tu correo electrónico.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showAlert(alertBox, 'error', '⚠️ El email no tiene un formato válido.');
  }

  const label = type === 'user' ? 'usuario' : 'contraseña';
  setLoading(btn, true, `Enviando...`);

  try {
    const res  = await fetch(`${API}/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(alertBox, 'error', `❌ ${data.error}`);
      return;
    }

    // Éxito
    document.getElementById('forgot-form').style.display = 'none';
    const card = document.querySelector('.card');

    // Inyectar estado de éxito
    const successHtml = `
      <div class="state-icon success" style="margin-top:0.5rem;">📧</div>
      <h2 class="card-title">¡Instrucciones Enviadas!</h2>
      <p class="card-description">
        ${type === 'user'
          ? 'Revisa la consola del servidor — tu nombre de usuario aparecerá ahí.'
          : 'Revisa la consola del servidor — encontrarás el link de reset.'}
      </p>
      <div class="alert alert-info" style="margin-top:1.5rem;">
        <span class="alert-icon">ℹ️</span>
        <span>En producción, el email llegaría a <strong>${email}</strong>. En este entorno de prueba, los emails se simulan en la consola del servidor.</span>
      </div>
      <a href="index.html" class="btn btn-primary" style="margin-top:1rem;">
        Volver al inicio de sesión
      </a>`;

    // Reemplazar contenido
    const wrapper = document.createElement('div');
    wrapper.innerHTML = successHtml;
    wrapper.style.textAlign = 'center';
    card.appendChild(wrapper);

  } catch {
    showAlert(alertBox, 'error', '❌ No se pudo conectar con el servidor. ¿Está corriendo?');
  } finally {
    setLoading(btn, false, 'Enviar Instrucciones');
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
