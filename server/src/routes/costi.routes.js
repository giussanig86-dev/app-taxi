const router = require('express').Router();
const ctrl = require('../controllers/costi.controller');
const importCtrl = require('../controllers/importCosti.controller');
const importBatchCtrl = require('../controllers/importBatch.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateCosto, validateObjectId } = require('../middleware/validate');

router.use(protect);

// Import registro IVA (solo consulente, richiede ?userId=clienteId)
router.post('/import/preview',
  authorize('consulente'), tenantGuard,
  importCtrl.uploadMiddleware, importCtrl.preview
);
router.post('/import/confirm',
  authorize('consulente'), tenantGuard,
  importCtrl.confirm
);

// Import batch: più file, uno per cliente
router.post('/import/batch',
  authorize('consulente'),
  importBatchCtrl.uploadMiddleware, importBatchCtrl.importBatch
);

// Route consulente-specifiche
router.get('/da-approvare', authorize('consulente'), ctrl.daApprovare);
router.patch('/:id/approva', authorize('consulente'), validateObjectId, ctrl.approva);
router.patch('/:id/rifiuta', authorize('consulente'), validateObjectId, ctrl.rifiuta);

// Route comuni con tenant guard
router.use(authorize('cliente', 'consulente'), tenantGuard);

// Stats
router.get('/stats/anno', ctrl.statsAnno);
router.get('/stats/categorie', ctrl.statsCategorie);

// CRUD
router.route('/')
  .get(ctrl.getAll)
  .post(validateCosto, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(validateObjectId, ctrl.update)
  .delete(validateObjectId, ctrl.delete);

module.exports = router;
