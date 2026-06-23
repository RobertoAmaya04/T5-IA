const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'authflow_secret_key_2024_seguro';

/**
 * Middleware para validar JWT en rutas protegidas.
 * Espera el header: Authorization: Bearer <token>
 */
const validateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Sesión expirada. Por favor inicia sesión de nuevo.' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

module.exports = { validateToken, JWT_SECRET };
