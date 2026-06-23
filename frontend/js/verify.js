/* ─── verify.js ────────────────────────────────────────────────
   Verifica el token de email al cargar la página
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

(async function verifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const content = document.getElementById('verify-content');

  // Sin token en la URL
  if (!token) {
    renderState(content, 'error', '⛔', 'Link Inválido',
      'Este link de verificación no contiene un token válido.',
      'index.html', 'Ir al inicio de sesión');
    return;
  }

  // Llamar al backend
  try {
    const res  = await fetch(`${API}/verify-email?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (res.ok) {
      // Éxito
      renderState(content, 'success', '✅', '¡Email Verificado!',
        `Tu cuenta ha sido activada exitosamente${data.name ? ', <strong>' + data.name + '</strong>' : ''}. Ya puedes iniciar sesión.`,
        'index.html', 'Iniciar Sesión');
    } else {
      // Error (token inválido, ya usado, etc.)
      renderState(content, 'error', '❌', 'Error de Verificación',
        data.error || 'Token inválido o ya utilizado.',
        'index.html', 'Ir al inicio de sesión');
    }

  } catch {
    renderState(content, 'error', '⚠️', 'Sin Conexión',
      'No se pudo conectar con el servidor. Asegúrate de que está corriendo.',
      'index.html', 'Ir al inicio de sesión');
  }
})();

// ─── Renderizar estado dinámico ────────────────────────────────

function renderState(container, type, icon, title, message, href, linkText) {
  const stateClass = type === 'success' ? 'success' : 'error';
  container.innerHTML = `
    <div class="state-icon ${stateClass}">${icon}</div>
    <h1 class="card-title">${title}</h1>
    <p class="card-description">${message}</p>
    <a href="${href}" class="btn btn-primary" style="margin-top:1.5rem;">${linkText}</a>`;
}
