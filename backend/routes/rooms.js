const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { validateToken } = require('../middleware/validateToken');

const ROOMS_FILE = path.join(__dirname, '../data/rooms.json');
const RESERVATIONS_FILE = path.join(__dirname, '../data/reservations.json');
const HISTORY_FILE = path.join(__dirname, '../data/history.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// ─── Helpers de Lectura/Escritura ──────────────────────────────────────────

const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ─── Middleware para verificar Rol de Admin ────────────────────────────────

const validateAdmin = (req, res, next) => {
  try {
    const users = readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor en validación de rol' });
  }
};

// ─── Endpoints de Cliente / Comunes ────────────────────────────────────────

// GET /api/rooms - Listar habitaciones
router.get('/', (req, res) => {
  const rooms = readData(ROOMS_FILE);
  res.json(rooms);
});

// GET /api/rooms/my-reservations - Obtener reservas del cliente
router.get('/my-reservations', validateToken, (req, res) => {
  try {
    const reservations = readData(RESERVATIONS_FILE);
    const myReservations = reservations.filter(r => r.userId === req.user.id);
    res.json(myReservations);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus reservaciones' });
  }
});

// GET /api/rooms/:id - Detalle de habitación
router.get('/:id', (req, res) => {
  const rooms = readData(ROOMS_FILE);
  const room = rooms.find(r => r.id === req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Habitación no encontrada' });
  }
  res.json(room);
});

// POST /api/rooms/:id/reserve - Reservar una habitación (Cliente)
router.post('/:id/reserve', validateToken, (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Debes seleccionar una fecha de inicio y fin para tu reserva' });
    }

    const rooms = readData(ROOMS_FILE);
    const roomIndex = rooms.findIndex(r => r.id === req.params.id);

    if (roomIndex === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const room = rooms[roomIndex];

    if (room.status !== 'disponible') {
      return res.status(400).json({ error: 'La habitación ya está ocupada o reservada' });
    }

    // Cambiar estado a ocupada
    rooms[roomIndex].status = 'ocupada';
    writeData(ROOMS_FILE, rooms);

    // Guardar reserva
    const reservations = readData(RESERVATIONS_FILE);
    const newReservation = {
      id: uuidv4(),
      roomId: room.id,
      roomName: room.name,
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      date: new Date().toISOString(),
      startDate: startDate,
      endDate: endDate,
      price: room.price
    };
    reservations.push(newReservation);
    writeData(RESERVATIONS_FILE, reservations);

    // Guardar movimiento de historial
    const history = readData(HISTORY_FILE);
    const newMovement = {
      id: uuidv4(),
      type: 'reserva',
      description: `Habitación "${room.name}" reservada por el cliente ${req.user.name} desde ${startDate} hasta ${endDate}`,
      date: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.name,
      roomId: room.id
    };
    history.push(newMovement);
    writeData(HISTORY_FILE, history);

    res.json({
      message: 'Reserva realizada exitosamente',
      reservation: newReservation
    });

  } catch (err) {
    console.error('[reserve]', err);
    res.status(500).json({ error: 'Error interno del servidor al realizar la reserva' });
  }
});

// ─── Endpoints de Administrador ────────────────────────────────────────────

// GET /api/rooms/admin/stats - Obtener contadores del Admin
router.get('/admin/stats', validateToken, validateAdmin, (req, res) => {
  try {
    const rooms = readData(ROOMS_FILE);
    const available = rooms.filter(r => r.status === 'disponible').length;
    const occupied = rooms.filter(r => r.status === 'ocupada').length;
    const total = rooms.length;

    res.json({
      stats: {
        available,
        occupied,
        total
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas del servidor' });
  }
});

// GET /api/rooms/admin/history - Obtener historial de movimientos
router.get('/admin/history', validateToken, validateAdmin, (req, res) => {
  try {
    const history = readData(HISTORY_FILE);
    // Ordenar de más reciente a más antiguo
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedHistory);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

// POST /api/rooms/admin/toggle-status - Liberar o bloquear habitación manualmente
router.post('/admin/toggle-status', validateToken, validateAdmin, (req, res) => {
  try {
    const { roomId, status } = req.body;

    if (!roomId || !status || !['disponible', 'ocupada'].includes(status)) {
      return res.status(400).json({ error: 'ID de habitación y estado ("disponible" o "ocupada") son requeridos' });
    }

    const rooms = readData(ROOMS_FILE);
    const roomIndex = rooms.findIndex(r => r.id === roomId);

    if (roomIndex === -1) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }

    const oldStatus = rooms[roomIndex].status;
    if (oldStatus === status) {
      return res.status(400).json({ error: `La habitación ya se encuentra en estado: ${status}` });
    }

    rooms[roomIndex].status = status;
    writeData(ROOMS_FILE, rooms);

    // Guardar movimiento de historial
    const history = readData(HISTORY_FILE);
    const newMovement = {
      id: uuidv4(),
      type: 'cambio_estado',
      description: `El administrador cambió el estado de "${rooms[roomIndex].name}" a "${status.toUpperCase()}"`,
      date: new Date().toISOString(),
      userId: req.user.id,
      userName: req.user.name,
      roomId: roomId
    };
    history.push(newMovement);
    writeData(HISTORY_FILE, history);

    res.json({
      message: 'Estado de habitación actualizado exitosamente',
      room: rooms[roomIndex]
    });

  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar el estado de la habitación' });
  }
});

// GET /api/rooms/admin/financial-stats - Obtener usuarios, reservaciones, pagos e ingresos totales (Admin)
router.get('/admin/financial-stats', validateToken, validateAdmin, (req, res) => {
  try {
    const users = readData(USERS_FILE);
    const reservations = readData(RESERVATIONS_FILE);
    
    // Obtener los clientes (excluir admin de la lista para enfoque de clientes, o incluir a todos)
    const clientUsers = users.filter(u => u.role !== 'admin');
    
    // Armar el reporte por cliente
    let totalRevenue = 0;
    const clientReport = clientUsers.map(user => {
      // Filtrar reservaciones de este usuario
      const userReservations = reservations.filter(r => r.userId === user.id);
      
      // Calcular lo pagado por este usuario
      let userSpent = 0;
      const details = userReservations.map(r => {
        let nights = 1;
        if (r.startDate && r.endDate) {
          const startMs = new Date(r.startDate).getTime();
          const endMs = new Date(r.endDate).getTime();
          const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) nights = diffDays;
        }
        const cost = r.price * nights;
        userSpent += cost;
        return {
          roomName: r.roomName,
          period: `${r.startDate} al ${r.endDate}`,
          nights,
          pricePerNight: r.price,
          total: cost
        };
      });
      
      totalRevenue += userSpent;
      
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        reservationsCount: userReservations.length,
        totalPaid: userSpent,
        details
      };
    });
    
    res.json({
      totalRevenue,
      clients: clientReport
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte financiero y de usuarios' });
  }
});

module.exports = router;
