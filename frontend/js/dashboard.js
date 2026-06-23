/* ─── dashboard.js ─────────────────────────────────────────────
   Lógica del panel principal — requiere JWT válido
   ─────────────────────────────────────────────────────────── */

const API = '/api/auth';

// ─── Verificar sesión ──────────────────────────────────────────
const token = localStorage.getItem('authToken');

if (!token) {
  // Sin sesión → redirigir al login
  window.location.href = 'index.html';
}

// ─── Cargar datos del usuario ──────────────────────────────────
(async function loadDashboard() {
  try {
    const res  = await fetch(`${API}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      // Token expirado o inválido
      logout();
      return;
    }

    const user = await res.json();
    renderUser(user);

  } catch {
    // Error de red — aún así mostramos datos del localStorage si existen
    const cached = localStorage.getItem('authUser');
    if (cached) {
      renderUser(JSON.parse(cached));
    }
  }
})();

// ─── Renderizar datos en la UI ─────────────────────────────────

function renderUser(user) {
  // Navbar
  const initial = (user.name || '?').charAt(0).toUpperCase();
  document.getElementById('nav-avatar').textContent = initial;
  document.getElementById('nav-name').textContent   = user.name || 'Usuario';

  // Bienvenida
  document.getElementById('welcome-name').textContent  = user.name || 'Usuario';
  document.getElementById('welcome-email').textContent = `Sesión activa: ${user.email}`;

  // Fecha de registro
  const date = user.createdAt ? formatDate(user.createdAt) : '—';
  document.getElementById('member-date').textContent = date;

  // Perfil
  document.getElementById('profile-name').textContent  = user.name  || '—';
  document.getElementById('profile-email').textContent = user.email || '—';
  document.getElementById('profile-id').textContent    = user.id    || '—';
  document.getElementById('profile-date').textContent  = date;
}

// ─── Logout ────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = 'index.html';
}

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day:   '2-digit',
      month: 'long',
      year:  'numeric'
    });
  } catch {
    return '—';
  }
}
