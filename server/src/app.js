/**
 * EXPRESS APP SETUP
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { FRONTEND_URL, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// ============ SICUREZZA ============
app.use(helmet());

// CORS
const allowedOrigins = FRONTEND_URL.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permetti tutti i sottodomini Render (*.onrender.com) in produzione
    if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 200,
  message: { status: 'fail', messaggio: 'Troppe richieste. Riprova tra 15 minuti.' }
});
app.use('/api', limiter);

// Rate limiting login piu' restrittivo
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'fail', messaggio: 'Troppi tentativi di login. Riprova tra 15 minuti.' }
});
app.use('/api/v1/auth/login', loginLimiter);

// ============ BODY PARSING ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ LOGGING ============
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ============ ROUTES ============
app.use('/api/v1', routes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ambiente: NODE_ENV
  });
});

// ============ FRONTEND STATICO (produzione) ============
const clientDist = path.join(__dirname, '../../client/dist');
if (NODE_ENV === 'production') {
  app.use(express.static(clientDist));
}

// 404 API / SPA fallback
app.all('*', (req, res) => {
  if (NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    // Tutte le route non-API → React Router gestisce
    res.sendFile(path.join(clientDist, 'index.html'));
  } else {
    res.status(404).json({
      status: 'fail',
      messaggio: `Route ${req.originalUrl} non trovata`
    });
  }
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

module.exports = app;
