/* ─── admin-dashboard.js ─────────────────────────────────────────
   Lógica del panel de administración del Hotel Penguin
   ─────────────────────────────────────────────────────────── */

const AUTH_API = '/api/auth';
const ROOMS_API = '/api/rooms';

// ─── Verificar sesión y rol ───────────────────────────────────
const token = localStorage.getItem('authToken');
const cachedUser = localStorage.getItem('authUser');

if (!token || !cachedUser) {
  logout();
} else {
  const user = JSON.parse(cachedUser);
  if (user.role !== 'admin') {
    window.location.href = 'client-dashboard.html';
  }
}

// ─── Cargar datos iniciales ────────────────────────────────────
(async function init() {
  // Cargar usuario
  try {
    const res = await fetch(`${AUTH_API}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const user = await res.json();
    if (user.role !== 'admin') {
      window.location.href = 'client-dashboard.html';
      return;
    }
    renderUser(user);

  } catch {
    if (cachedUser) {
      renderUser(JSON.parse(cachedUser));
    }
  }

  // Cargar estadísticas, habitaciones e historial
  await loadAdminData();
  
  // Configurar pestañas
  initTabNavigation();
})();

// Renderizar datos del admin
function renderUser(user) {
  const initial = (user.name || '?').charAt(0).toUpperCase();
  document.getElementById('nav-avatar').textContent = initial;
  document.getElementById('nav-name').textContent   = user.name || 'Admin';
}

// ─── Pestañas de Navegación ────────────────────────────────────
function initTabNavigation() {
  const btnRooms = document.getElementById('nav-btn-rooms');
  const btnFinance = document.getElementById('nav-btn-finance');
  const viewRooms = document.getElementById('view-rooms');
  const viewFinance = document.getElementById('view-finance');

  btnRooms.addEventListener('click', () => {
    // Activar botón Habitaciones
    btnRooms.style.background = 'var(--cp-blue-sky)';
    btnRooms.style.border = '2px solid white';
    btnRooms.style.color = 'white';

    // Desactivar botón Finanzas
    btnFinance.style.background = 'transparent';
    btnFinance.style.border = '2px solid var(--cp-blue-sky)';
    btnFinance.style.color = '#cce0ff';

    // Switch views
    viewRooms.style.display = 'grid';
    viewFinance.style.display = 'none';
  });

  btnFinance.addEventListener('click', async () => {
    // Activar botón Finanzas
    btnFinance.style.background = 'var(--cp-blue-sky)';
    btnFinance.style.border = '2px solid white';
    btnFinance.style.color = 'white';

    // Desactivar botón Habitaciones
    btnRooms.style.background = 'transparent';
    btnRooms.style.border = '2px solid var(--cp-blue-sky)';
    btnRooms.style.color = '#cce0ff';

    // Switch views
    viewRooms.style.display = 'none';
    viewFinance.style.display = 'block';

    // Cargar reporte de finanzas
    await loadFinancialReport();
  });
}

// ─── Cargar reporte financiero ─────────────────────────────────
async function loadFinancialReport() {
  const tableBody = document.getElementById('finance-table-body');
  const totalRevenueEl = document.getElementById('total-revenue-el');

  try {
    const res = await fetch(`${ROOMS_API}/admin/financial-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener reporte financiero');
    const data = await res.json();

    totalRevenueEl.textContent = `L. ${data.totalRevenue.toLocaleString()}`;
    tableBody.innerHTML = '';

    if (data.clients.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #666; padding: 20px;">
            No hay clientes registrados en el sistema.
          </td>
        </tr>`;
      return;
    }

    data.clients.forEach(client => {
      const tr = document.createElement('tr');
      
      // Armar el detalle de habitaciones reservadas
      let roomsDetailsHtml = '';
      if (client.details.length === 0) {
        roomsDetailsHtml = '<span style="color: #999; font-style: italic;">Sin habitaciones reservadas</span>';
      } else {
        roomsDetailsHtml = client.details.map(d => `
          <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #eee;">
            <strong style="color: var(--cp-blue-dark);">${d.roomName}</strong><br>
            <span style="font-size: 0.85rem; color: #555;">📅 ${d.period} (${d.nights} noches)</span><br>
            <span style="font-size: 0.85rem; color: #555;">Tarifa: L. ${d.pricePerNight}/noche &bull; Subtotal: <strong>L. ${d.total.toLocaleString()}</strong></span>
          </div>
        `).join('');
      }

      tr.innerHTML = `
        <td style="vertical-align: top;">
          <div style="font-weight: bold; color: var(--cp-blue-dark);">${client.name}</div>
        </td>
        <td style="vertical-align: top;">${client.email}</td>
        <td style="vertical-align: top;">
          ${roomsDetailsHtml}
        </td>
        <td style="vertical-align: top; font-weight: 700; color: #008822; font-size: 1.1rem;">
          L. ${client.totalPaid.toLocaleString()}
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--cp-red); font-weight: bold; padding: 20px;">
          ❌ Error al cargar el reporte financiero.
        </td>
      </tr>`;
  }
}

// ─── Cargar Datos de Administración ────────────────────────────
async function loadAdminData() {
  await Promise.all([
    loadStats(),
    loadRoomsTable(),
    loadHistory()
  ]);
}

// 1. Obtener Estadísticas
async function loadStats() {
  try {
    const res = await fetch(`${ROOMS_API}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    const data = await res.json();

    document.getElementById('available-count').textContent = data.stats.available;
    document.getElementById('occupied-count').textContent = data.stats.occupied;

  } catch (err) {
    console.error(err);
  }
}

// 2. Obtener Tabla de Habitaciones
async function loadRoomsTable() {
  const tableBody = document.getElementById('rooms-table-body');
  
  try {
    const res = await fetch(ROOMS_API);
    if (!res.ok) throw new Error('Error al obtener habitaciones');
    const rooms = await res.json();

    tableBody.innerHTML = '';

    rooms.forEach(room => {
      const tr = document.createElement('tr');

      const isDisponible = room.status === 'disponible';
      const badgeClass = isDisponible ? 'disponible' : 'ocupada';
      const actionText = isDisponible ? 'Marcar Ocupada 🚪' : 'Liberar Habitación 🔑';
      const actionClass = isDisponible ? 'ocupar' : 'liberar';
      const nextStatus = isDisponible ? 'ocupada' : 'disponible';

      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: var(--cp-blue-dark);">${room.name}</div>
          <div style="font-size: 0.8rem; color: #777;">${room.shortDescription}</div>
        </td>
        <td style="font-weight: 700; color: var(--cp-orange);">L. ${room.price}</td>
        <td>
          <span class="badge-status ${badgeClass}">${room.status}</span>
        </td>
        <td>
          <button class="btn-action-sm ${actionClass}" onclick="toggleRoomStatus('${room.id}', '${nextStatus}')">
            ${actionText}
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--cp-red); font-weight: bold;">
          ❌ Error al cargar habitaciones.
        </td>
      </tr>`;
  }
}

// 3. Obtener Historial de Movimientos
async function loadHistory() {
  const container = document.getElementById('history-feed-container');

  try {
    const res = await fetch(`${ROOMS_API}/admin/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener historial');
    const history = await res.json();

    container.innerHTML = '';

    if (history.length === 0) {
      container.innerHTML = '<div class="history-empty">No se han registrado movimientos todavía.</div>';
      return;
    }

    history.forEach(item => {
      const div = document.createElement('div');
      div.className = `history-item ${item.type || ''}`;

      const icon = item.type === 'reserva' ? '🎉' : '⚙️';

      div.innerHTML = `
        <div class="history-text">
          <strong>${icon}</strong> ${item.description}
        </div>
        <div class="history-date">
          ${formatDateTime(item.date)}
        </div>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="history-empty" style="color: var(--cp-red);">❌ Error al cargar historial.</div>';
  }
}

// ─── Cambiar Estado de Habitación (Admin Action) ───────────────
window.toggleRoomStatus = async function(roomId, newStatus) {
  try {
    const res = await fetch(`${ROOMS_API}/admin/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ roomId, status: newStatus })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Error: ${data.error || 'No se pudo actualizar el estado'}`);
      return;
    }

    // Recargar datos actualizados
    await loadAdminData();

  } catch (err) {
    console.error(err);
    alert('Error al conectar con el servidor.');
  }
};

// ─── Logout ────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = 'index.html';
}

// ─── Helpers ───────────────────────────────────────────────────
function formatDateTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}
