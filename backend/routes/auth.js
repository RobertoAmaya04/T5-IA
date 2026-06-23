const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { validateToken, JWT_SECRET } = require('../middleware/validateToken');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// ─── Helpers de base de datos ─────────────────────────────────

const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// ─── Simulador de Email ───────────────────────────────────────

const simulateEmail = (to, subject, body) => {
  const line = '─'.repeat(60);
  console.log('\n' + line);
  console.log('  📧  EMAIL SIMULADO');
  console.log(line);
  console.log(`  Para    : ${to}`);
  console.log(`  Asunto  : ${subject}`);
  console.log(line);
  console.log(body);
  console.log(line + '\n');
};

// ─── Validaciones ─────────────────────────────────────────────

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/register
//  Registra un nuevo usuario
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validar campos
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const users = readUsers();

    // Verificar si el email ya existe
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'El email ya está registrado en el sistema' });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar token de verificación
    const verificationToken = uuidv4();

    // Crear usuario (verificado automáticamente)
    const newUser = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'client',
      verified: true,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    // Simular envío de email de verificación
    const verifyUrl = `http://localhost:3000/verify.html?token=${verificationToken}`;
    simulateEmail(
      email,
      '✅ Verifica tu cuenta — AuthFlow',
      `  Hola ${name}!\n\n  Gracias por registrarte. Verifica tu cuenta:\n\n  ${verifyUrl}\n\n  (Este link es válido por 24 horas)`
    );

    // Generar JWT para acceso inmediato al dashboard
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Cuenta creada exitosamente.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });

  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/auth/verify-email?token=xxx
//  Verifica el email del usuario
// ─────────────────────────────────────────────────────────────
router.get('/verify-email', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token de verificación requerido' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.verificationToken === token);

    if (idx === -1) {
      return res.status(400).json({ error: 'Token inválido o ya utilizado' });
    }

    users[idx].verified = true;
    users[idx].verificationToken = null;
    writeUsers(users);

    res.json({
      message: '¡Email verificado exitosamente! Ya puedes iniciar sesión.',
      name: users[idx].name
    });

  } catch (err) {
    console.error('[verify-email]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Inicia sesión y devuelve JWT
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.verified) {
      return res.status(401).json({
        error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu correo.',
        needsVerification: true
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Sesión iniciada exitosamente',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'client',
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/forgot
//  Recuperar usuario o contraseña
// ─────────────────────────────────────────────────────────────
router.post('/forgot', (req, res) => {
  try {
    const { email, type } = req.body; // type: 'user' | 'password'

    if (!email || !type) {
      return res.status(400).json({ error: 'Email y tipo de recuperación son requeridos' });
    }

    if (!['user', 'password'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido. Debe ser "user" o "password"' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase().trim());

    // Por seguridad, siempre respondemos igual aunque el email no exista
    const genericMsg = 'Si el email está registrado, recibirás las instrucciones en la consola del servidor.';

    if (idx === -1) {
      return res.json({ message: genericMsg });
    }

    const user = users[idx];

    if (type === 'user') {
      // Enviar el nombre de usuario
      simulateEmail(
        email,
        '👤 Tu usuario — AuthFlow',
        `  Hola!\n\n  Tu nombre de usuario registrado es:\n\n  ➡  "${user.name}"\n\n  Puedes iniciar sesión con tu email: ${user.email}`
      );
    } else {
      // Generar token de reset (expira en 1 hora)
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      users[idx].resetToken = resetToken;
      users[idx].resetTokenExpiry = resetTokenExpiry;
      writeUsers(users);

      const resetUrl = `http://localhost:3000/reset-password.html?token=${resetToken}`;
      simulateEmail(
        email,
        '🔑 Restablece tu contraseña — AuthFlow',
        `  Hola ${user.name}!\n\n  Solicitaste restablecer tu contraseña. Haz clic aquí:\n\n  ${resetUrl}\n\n  ⚠  Este link expira en 1 hora.\n  Si no solicitaste esto, ignora este mensaje.`
      );
    }

    res.json({ message: genericMsg });

  } catch (err) {
    console.error('[forgot]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/reset-password
//  Cambia la contraseña con el token de reset
// ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.resetToken === token);

    if (idx === -1) {
      return res.status(400).json({ error: 'Token inválido o ya utilizado' });
    }

    // Verificar expiración
    if (new Date() > new Date(users[idx].resetTokenExpiry)) {
      users[idx].resetToken = null;
      users[idx].resetTokenExpiry = null;
      writeUsers(users);
      return res.status(400).json({
        error: 'El link de recuperación ha expirado. Solicita uno nuevo.',
        expired: true
      });
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    users[idx].password = hashedPassword;
    users[idx].resetToken = null;
    users[idx].resetTokenExpiry = null;
    writeUsers(users);

    res.json({ message: '¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión.' });

  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/auth/me  [PROTEGIDA]
//  Devuelve datos del usuario autenticado
// ─────────────────────────────────────────────────────────────
router.get('/me', validateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'client',
    verified: user.verified,
    createdAt: user.createdAt
  });
});

module.exports = router;
