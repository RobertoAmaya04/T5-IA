/* ─── room-detail.js ─────────────────────────────────────────────
   Lógica del detalle de habitación y procesamiento de reservas
   ─────────────────────────────────────────────────────────── */

const AUTH_API = '/api/auth';
const ROOMS_API = '/api/rooms';

// ─── Verificar sesión ──────────────────────────────────────────
const token = localStorage.getItem('authToken');
const cachedUser = localStorage.getItem('authUser');

if (!token || !cachedUser) {
  logout();
}

// Obtener ID de la habitación de la URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');

if (!roomId) {
  window.location.href = 'client-dashboard.html';
}

// Variable global para guardar el precio por noche
let roomPricePerNight = 0;

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
    renderUser(user);

  } catch {
    if (cachedUser) {
      renderUser(JSON.parse(cachedUser));
    }
  }

  // Cargar detalles de la habitación
  await loadRoomDetail();

  // Inicializar lógica del modal de fechas
  initReservationModal();
})();

// Renderizar navbar
function renderUser(user) {
  const initial = (user.name || '?').charAt(0).toUpperCase();
  document.getElementById('nav-avatar').textContent = initial;
  document.getElementById('nav-name').textContent   = user.name || 'Cliente';
}

// ─── Cargar detalles ───────────────────────────────────────────
async function loadRoomDetail() {
  const loader = document.getElementById('detail-loader');
  const card = document.getElementById('detail-card-el');

  try {
    const res = await fetch(`${ROOMS_API}/${roomId}`);
    if (!res.ok) throw new Error('Habitación no encontrada');
    const room = await res.json();

    roomPricePerNight = room.price;

    // Rellenar elementos
    document.getElementById('detail-image-el').src = room.image;
    document.getElementById('detail-image-el').onerror = function() {
      this.src = 'img/habitacion_hotel_1.png';
    };
    document.getElementById('detail-title-el').textContent = room.name;
    document.getElementById('detail-price-el').textContent = `L. ${room.price} / Noche`;
    document.getElementById('detail-desc-el').textContent = room.description;

    // Renderizar comodidades / características
    const featuresList = document.getElementById('detail-features-el');
    featuresList.innerHTML = '';
    const features = room.shortDescription.split(',');
    features.forEach(feat => {
      const li = document.createElement('li');
      li.innerHTML = `❄️ ${feat.trim()}`;
      featuresList.appendChild(li);
    });

    // Configurar botón de reserva según disponibilidad
    const reserveBtn = document.getElementById('btn-reserve-el');
    if (room.status !== 'disponible') {
      reserveBtn.disabled = true;
      reserveBtn.textContent = '❌ Habitación Ocupada / Reservada';
    } else {
      reserveBtn.disabled = false;
      reserveBtn.textContent = '🛎️ Reservar Habitación';
      // Al hacer click, abrir el modal de fechas
      reserveBtn.addEventListener('click', openReservationModal);
    }

    // Ocultar loader, mostrar tarjeta
    loader.style.display = 'none';
    card.style.display = 'block';

  } catch (err) {
    console.error(err);
    loader.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #a2c2ff;">
        <h2 style="font-family: var(--font-title); color: var(--cp-red); margin-bottom: 10px;">❌ Habitación no encontrada</h2>
        <p style="margin-bottom: 20px;">No se pudo encontrar la habitación solicitada o el servidor está inactivo.</p>
        <a href="client-dashboard.html" class="btn-back" style="display: inline-flex;">Volver al listado</a>
      </div>`;
  }
}

// ─── Modal de Reserva con Fechas ───────────────────────────────

function initReservationModal() {
  const modal = document.getElementById('reservation-modal');
  const dateStart = document.getElementById('date-start');
  const dateEnd = document.getElementById('date-end');
  const daysCount = document.getElementById('days-count');
  const totalPriceEl = document.getElementById('total-price-el');
  const confirmBtn = document.getElementById('btn-confirm-reservation');
  const closeBtn = document.getElementById('btn-close-reservation');

  // Establecer fecha mínima como hoy
  const today = new Date().toISOString().split('T')[0];
  dateStart.min = today;
  dateEnd.min = today;

  // Calcular precio total cuando cambien las fechas
  function recalculate() {
    const start = dateStart.value;
    const end = dateEnd.value;

    if (start && end) {
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        daysCount.textContent = diffDays;
        totalPriceEl.textContent = `L. ${(roomPricePerNight * diffDays).toLocaleString()}`;
        confirmBtn.disabled = false;
        return;
      }
    }
    daysCount.textContent = '0';
    totalPriceEl.textContent = 'L. 0';
    confirmBtn.disabled = true;
  }

  dateStart.addEventListener('change', () => {
    // Cuando se selecciona inicio, ajustar mínimo de fin
    if (dateStart.value) {
      const nextDay = new Date(dateStart.value);
      nextDay.setDate(nextDay.getDate() + 1);
      dateEnd.min = nextDay.toISOString().split('T')[0];
    }
    recalculate();
  });

  dateEnd.addEventListener('change', recalculate);

  // Cerrar modal
  closeBtn.addEventListener('click', closeReservationModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeReservationModal();
  });

  // Confirmar reserva
  confirmBtn.addEventListener('click', () => {
    makeReservation(dateStart.value, dateEnd.value);
  });
}

function openReservationModal() {
  const modal = document.getElementById('reservation-modal');
  // Reset inputs
  document.getElementById('date-start').value = '';
  document.getElementById('date-end').value = '';
  document.getElementById('days-count').textContent = '0';
  document.getElementById('total-price-el').textContent = 'L. 0';
  document.getElementById('btn-confirm-reservation').disabled = true;
  modal.classList.add('active');
}

function closeReservationModal() {
  document.getElementById('reservation-modal').classList.remove('active');
}

// ─── Realizar Reserva ──────────────────────────────────────────
async function makeReservation(startDate, endDate) {
  const confirmBtn = document.getElementById('btn-confirm-reservation');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Procesando reserva...';

  try {
    const res = await fetch(`${ROOMS_API}/${roomId}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ startDate, endDate })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Error al reservar: ${data.error || 'Intente nuevamente'}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar Reserva';
      return;
    }

    // Cerrar modal de fechas
    closeReservationModal();

    // Mostrar modal de éxito
    const successModal = document.getElementById('success-modal');
    document.getElementById('success-modal-message').textContent = 
      `¡Tu reservación para "${data.reservation.roomName}" fue exitosa! Periodo: ${startDate} al ${endDate}. Precio por noche: L. ${data.reservation.price}.`;
    successModal.classList.add('active');

    // Configurar botón del modal
    document.getElementById('btn-success-close').addEventListener('click', () => {
      successModal.classList.remove('active');
      window.location.href = 'client-dashboard.html';
    });

  } catch (err) {
    console.error(err);
    alert('Ocurrió un error al procesar la reserva. Asegúrese de que el servidor esté activo.');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar Reserva';
  }
}

// ─── Logout ────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = 'index.html';
}
