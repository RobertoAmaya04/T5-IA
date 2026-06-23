const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Servir frontend estático ─────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Rutas de API ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);

// ─── Fallback: servir index.html para rutas del frontend ──────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  }
});

// ─── Iniciar servidor ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(55));
  console.log('  🔐  AuthFlow — Servidor de Autenticación');
  console.log('═'.repeat(55));
  console.log(`  🌐  URL:    http://localhost:${PORT}`);
  console.log(`  📡  API:    http://localhost:${PORT}/api/auth`);
  console.log('─'.repeat(55));
  console.log('  📧  Los tokens de verificación y reset');
  console.log('      se mostrarán aquí en la consola.');
  console.log('═'.repeat(55) + '\n');
});
