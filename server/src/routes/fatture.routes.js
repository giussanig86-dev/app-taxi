const router = require('express').Router();
const ctrl = require('../controllers/fatture.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateFattura, validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

// Stats
router.get('/stats/anno', ctrl.statsAnno);
router.get('/stats/scadute', ctrl.statsScadute);
router.get('/stats/scadenze', ctrl.statsScadenze);

// CRUD
router.route('/')
  .get(ctrl.getAll)
  .post(authorize('cliente'), validateFattura, ctrl.create);

router.route('/:id')
  .get(validateObjectId, ctrl.getOne)
  .put(authorize('cliente'), validateObjectId, ctrl.update)
  .delete(authorize('cliente'), validateObjectId, ctrl.delete);

router.patch('/:id/paga', validateObjectId, ctrl.marcaPagata);

module.exports = router;
