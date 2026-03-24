const router = require('express').Router();
const ctrl = require('../controllers/corrispettivi.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateCorrispettivo, validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

// Stats routes (prima delle route con :id)
router.get('/stats/anno', ctrl.statsAnno);
router.get('/stats/mese', ctrl.statsMese);
router.get('/stats/metodi', ctrl.statsMetodi);
router.get('/stats/andamento', ctrl.statsAndamento);

// CRUD
router.route('/')
  .get(ctrl.getAll)
  .post(authorize('cliente'), validateCorrispettivo, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(authorize('cliente'), validateObjectId, validateCorrispettivo, ctrl.update)
  .delete(authorize('cliente'), validateObjectId, ctrl.delete);

module.exports = router;
