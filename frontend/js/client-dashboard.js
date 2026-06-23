/* ─── client-dashboard.js ────────────────────────────────────────
   Lógica del panel del cliente — Feed de habitaciones disponibles
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
  if (user.role === 'admin') {
    window.location.href = 'admin-dashboard.html';
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
    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
      return;
    }
    renderUser(user);

  } catch {
    if (cachedUser) {
      renderUser(JSON.parse(cachedUser));
    }
  }

  // Cargar habitaciones
  await loadRooms();
  await loadMyReservations();
})();

// ─── Renderizar datos del usuario en la UI ─────────────────────
function renderUser(user) {
  const initial = (user.name || '?').charAt(0).toUpperCase();
  document.getElementById('nav-avatar').textContent = initial;
  document.getElementById('nav-name').textContent   = user.name || 'Cliente';
}

// ─── Obtener y renderizar habitaciones disponibles ─────────────
async function loadRooms() {
  try {
    const res = await fetch(ROOMS_API);
    if (!res.ok) throw new Error('Error al obtener habitaciones');
    const rooms = await res.json();
    renderRooms(rooms);
  } catch (err) {
    console.error(err);
    document.getElementById('rooms-feed-container').innerHTML = `
      <div class="db-card" style="text-align: center; padding: 40px; background: white; color: #333; border: 4px solid var(--cp-red); border-radius: 20px;">
        <h2 style="font-family: var(--font-title); color: var(--cp-red); margin-bottom: 10px;">❌ Error de conexión</h2>
        <p style="color: #666;">No pudimos cargar las habitaciones en este momento. Asegúrate de que el servidor esté activo.</p>
      </div>`;
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('rooms-feed-container');
  container.innerHTML = '';

  const availableRooms = rooms.filter(r => r.status === 'disponible');

  if (availableRooms.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #a2c2ff;">
        <h3 style="font-family: var(--font-title); margin-bottom: 5px;">¡Habitaciones llenas! 🐧</h3>
        <p style="font-size: 0.9rem;">No hay habitaciones disponibles por ahora.</p>
      </div>`;
    return;
  }

  availableRooms.forEach(room => {
    const card = document.createElement('div');
    card.style.display = 'flex';
    card.style.background = '#ffffff';
    card.style.color = '#333333';
    card.style.border = '3px solid var(--cp-blue-dark)';
    card.style.borderRadius = '16px';
    card.style.overflow = 'hidden';
    card.style.boxShadow = '0 5px 0 rgba(0, 0, 0, 0.1)';
    card.style.transition = 'transform 0.15s ease';
    card.style.cursor = 'pointer';
    card.style.minHeight = '110px';

    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
    card.addEventListener('click', () => {
      window.location.href = `room-detail.html?id=${room.id}`;
    });

    card.innerHTML = `
      <div style="width: 100px; flex-shrink: 0; background: #e0f2ff; border-right: 3px solid var(--cp-blue-dark);">
        <img src="${room.image}" alt="${room.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='img/habitacion_hotel_1.png'">
      </div>
      <div style="flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-family: var(--font-title); font-size: 1.15rem; color: var(--cp-blue-dark); margin: 0 0 4px 0;">${room.name}</h3>
          <p style="font-size: 0.85rem; color: #666; margin: 0 0 6px 0; line-clamp: 1; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${room.shortDescription}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 8px;">
          <div style="font-family: var(--font-title); font-size: 1.05rem; color: var(--cp-orange); font-weight: 700;">L. ${room.price} <span style="font-size: 0.75rem; color: #666; font-weight: normal;">/ noche</span></div>
          <span style="font-size: 0.8rem; font-weight: bold; color: var(--font-title); color: #0044cc;">Reservar 🛎️</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── Cargar Mis Reservas ──────────────────────────────────────────
async function loadMyReservations() {
  try {
    const res = await fetch(ROOMS_API + '/my-reservations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener mis reservas');
    const reservations = await res.json();
    
    const roomsRes = await fetch(ROOMS_API);
    const rooms = roomsRes.ok ? await roomsRes.json() : [];
    
    renderMyReservations(reservations, rooms);
  } catch (err) {
    console.error(err);
    document.getElementById('my-rooms-feed-container').innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--cp-red); font-weight: bold; font-size: 0.9rem;">
        Error al cargar tus reservas.
      </div>`;
  }
}

function renderMyReservations(reservations, rooms) {
  const container = document.getElementById('my-rooms-feed-container');
  container.innerHTML = '';

  if (reservations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #a2c2ff; background: rgba(0,0,0,0.15); border-radius: 16px; border: 2px dashed rgba(255,255,255,0.1);">
        <p style="font-size: 0.95rem; font-weight: 600; margin: 0;">Aún no tienes habitaciones reservadas.</p>
      </div>`;
    return;
  }

  reservations.forEach(res => {
    const room = rooms.find(r => r.id === res.roomId);
    const roomImg = room ? room.image : 'img/habitacion_hotel_1.png';
    
    let nights = 1;
    if (res.startDate && res.endDate) {
      const startMs = new Date(res.startDate).getTime();
      const endMs = new Date(res.endDate).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) nights = diffDays;
    }
    const total = res.price * nights;

    const card = document.createElement('div');
    card.style.display = 'flex';
    card.style.background = '#ffffff';
    card.style.color = '#333333';
    card.style.border = '3px solid var(--cp-yellow)';
    card.style.borderRadius = '16px';
    card.style.overflow = 'hidden';
    card.style.boxShadow = '0 5px 0 rgba(0, 0, 0, 0.1)';
    card.style.minHeight = '110px';

    card.innerHTML = `
      <div style="width: 100px; flex-shrink: 0; background: #fffde0; border-right: 3px solid var(--cp-yellow);">
        <img src="${roomImg}" alt="${res.roomName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='img/habitacion_hotel_1.png'">
      </div>
      <div style="flex: 1; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-family: var(--font-title); font-size: 1.1rem; color: var(--cp-blue-dark); margin: 0 0 4px 0;">${res.roomName}</h3>
          <p style="font-size: 0.8rem; font-weight: 700; color: #333; margin: 0 0 4px 0;">
            📅 <span style="color: #008822;">${res.startDate || 'N/A'}</span> al <span style="color: #008822;">${res.endDate || 'N/A'}</span> (${nights} n)
          </p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #eee; padding-top: 6px; margin-top: 4px;">
          <div style="font-size: 0.8rem; color: #666;">L. ${res.price} / noche</div>
          <div style="font-family: var(--font-title); font-size: 1.15rem; color: #008822; font-weight: 800;">Total: L. ${total.toLocaleString()}</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── Logout ────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = 'index.html';
}
