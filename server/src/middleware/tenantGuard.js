/**
 * TENANT GUARD MIDDLEWARE
 * Garantisce isolamento dati multi-tenant
 *
 * - Cliente: accede SOLO ai propri dati
 * - Consulente: accede ai dati dei PROPRI clienti
 * - Super Admin: accede a tutto
 */

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const tenantGuard = catchAsync(async (req, res, next) => {
  const { ruolo, _id: currentUserId } = req.user;

  // Super Admin: accesso totale
  if (ruolo === 'super_admin') {
    req.tenantFilter = {};
    return next();
  }

  // Cliente: solo i propri dati
  if (ruolo === 'cliente') {
    req.tenantFilter = { userId: currentUserId };
    req.tenantUserId = currentUserId;
    return next();
  }

  // Consulente: dati dei propri clienti
  if (ruolo === 'consulente') {
    const requestedUserId = req.query.userId || req.params.userId;

    if (requestedUserId) {
      // Accesso a un singolo cliente specifico
      const cliente = await User.findOne({
        _id: requestedUserId,
        consulenteId: currentUserId,
        ruolo: 'cliente'
      });

      if (!cliente) {
        return next(new AppError('Cliente non trovato o non autorizzato.', 403));
      }

      req.tenantFilter = { userId: cliente._id };
      req.tenantUserId = cliente._id;
    } else {
      // Accesso aggregato a tutti i propri clienti
      const clienti = await User.find({
        consulenteId: currentUserId,
        ruolo: 'cliente',
        accountSospeso: false
      }).select('_id');

      const clientiIds = clienti.map(c => c._id);
      req.tenantFilter = { userId: { $in: clientiIds } };
      req.tenantClientIds = clientiIds;
    }

    return next();
  }

  return next(new AppError('Ruolo non riconosciuto.', 403));
});

module.exports = tenantGuard;
