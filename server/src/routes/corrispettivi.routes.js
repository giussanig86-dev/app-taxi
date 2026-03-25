const router = require('express').Router();
const ctrl = require('../controllers/corrispettivi.controller');
const importCtrl = require('../controllers/importCorrispettivi.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateCorrispettivo, validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

// Stats routes (prima delle route con :id)
router.get('/stats/anno', ctrl.statsAnno);
router.get('/stats/mese', ctrl.statsMese);
router.get('/stats/metodi', ctrl.statsMetodi);
router.get('/stats/andamento', ctrl.statsAndamento);

// Import registro corrispettivi (solo consulente, richiede ?userId=clienteId)
router.post('/import/preview',
  authorize('consulente'),
  importCtrl.uploadMiddleware, importCtrl.preview
);
router.post('/import/confirm',
  authorize('consulente'),
  importCtrl.confirm
);

// CRUD (cliente e consulente possono creare/modificare/eliminare)
router.route('/')
  .get(ctrl.getAll)
  .post(validateCorrispettivo, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(validateObjectId, validateCorrispettivo, ctrl.update)
  .delete(validateObjectId, ctrl.delete);

module.exports = router;
