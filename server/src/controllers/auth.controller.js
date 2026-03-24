const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const signToken = (id, ruolo, consulenteId) => {
  return jwt.sign({ id, ruolo, consulenteId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// POST /api/v1/auth/login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.verificaPassword(password))) {
    if (user) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save({ validateBeforeSave: false });
    }
    return next(new AppError('Email o password non corretti.', 401));
  }

  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    return next(new AppError('Account temporaneamente bloccato. Riprova tra 30 minuti.', 423));
  }

  user.loginAttempts = 0;
  user.accountLockedUntil = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id, user.ruolo, user.consulenteId);

  const userObj = user.toObject();
  delete userObj.password;

  res.status(200).json({
    status: 'success',
    token,
    data: { user: userObj }
  });
});

// GET /api/v1/auth/me
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('Utente non trovato.', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

// PUT /api/v1/auth/password
exports.changePassword = catchAsync(async (req, res, next) => {
  const { passwordAttuale, nuovaPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.verificaPassword(passwordAttuale))) {
    return next(new AppError('Password attuale non corretta.', 400));
  }

  user.password = nuovaPassword;
  await user.save();

  const token = signToken(user._id, user.ruolo, user.consulenteId);
  res.status(200).json({ status: 'success', token, messaggio: 'Password aggiornata con successo' });
});
