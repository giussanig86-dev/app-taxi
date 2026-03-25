const router = require('express').Router();
const ctrl = require('../controllers/versamenti.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateVersamento, validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

// Stats
router.get('/stats/scadenze', ctrl.statsScadenze);
router.get('/stats/scaduti', ctrl.statsScaduti);

// CRUD (cliente e consulente possono creare/modificare/eliminare)
router.route('/')
  .get(ctrl.getAll)
  .post(validateVersamento, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(validateObjectId, ctrl.update)
  .delete(validateObjectId, ctrl.delete);

router.patch('/:id/paga', validateObjectId, ctrl.marcaPagato);

module.exports = router;
