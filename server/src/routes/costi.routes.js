const router = require('express').Router();
const ctrl = require('../controllers/costi.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateCosto, validateObjectId } = require('../middleware/validate');

router.use(protect);

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
  .post(authorize('cliente'), validateCosto, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(authorize('cliente'), validateObjectId, ctrl.update)
  .delete(authorize('cliente'), validateObjectId, ctrl.delete);

module.exports = router;
