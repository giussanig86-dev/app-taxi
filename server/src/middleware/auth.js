/**
 * MIDDLEWARE AUTENTICAZIONE JWT
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Proteggi route - verifica JWT
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Estrai token dall'header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Non sei autenticato. Effettua il login.', 401));
  }

  // 2. Verifica token
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Token non valido.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token scaduto. Effettua nuovamente il login.', 401));
    }
    return next(new AppError('Errore autenticazione.', 401));
  }

  // 3. Trova utente
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError('Utente non trovato.', 401));
  }

  // 4. Controlla se account sospeso
  if (user.accountSospeso) {
    return next(new AppError('Account sospeso. Contatta il supporto.', 403));
  }

  // 5. Controlla se password cambiata dopo emissione JWT
  if (user.passwordCambiataDopoJWT(decoded.iat)) {
    return next(new AppError('Password modificata di recente. Effettua nuovamente il login.', 401));
  }

  // 6. Attacca utente alla request
  req.user = user;
  next();
});

/**
 * Autorizzazione per ruolo
 */
const authorize = (...ruoli) => {
  return (req, res, next) => {
    if (!ruoli.includes(req.user.ruolo)) {
      return next(new AppError('Non hai i permessi per questa azione.', 403));
    }
    next();
  };
};

module.exports = { protect, authorize };
