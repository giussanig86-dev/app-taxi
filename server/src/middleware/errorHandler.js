/**
 * GLOBAL ERROR HANDLER
 */

const { NODE_ENV } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errori = Object.values(err.errors).map(e => ({
      campo: e.path,
      messaggio: e.message
    }));
    return res.status(400).json({
      status: 'fail',
      messaggio: 'Errore di validazione',
      errori
    });
  }

  // Mongoose CastError (ObjectId non valido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      messaggio: `ID non valido: ${err.value}`
    });
  }

  // Mongoose Duplicate Key (11000)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      status: 'fail',
      messaggio: `Valore duplicato per il campo '${campo}'`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      messaggio: 'Token non valido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      messaggio: 'Token scaduto'
    });
  }

  // Errore operazionale noto
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      messaggio: err.message
    });
  }

  // Errore sconosciuto
  console.error('\u274C ERRORE:', err);

  res.status(500).json({
    status: 'error',
    messaggio: NODE_ENV === 'development'
      ? err.message
      : 'Errore interno del server'
  });
};

module.exports = errorHandler;
