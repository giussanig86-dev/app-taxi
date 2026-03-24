const router = require('express').Router();
const ctrl = require('../controllers/chilometri.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { validateChilometro, validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

router.get('/anno/:anno', ctrl.getByAnno);

router.route('/')
  .get(ctrl.getAll)
  .post(authorize('cliente'), validateChilometro, ctrl.createOrUpdate);

router.route('/:id')
  .put(authorize('cliente'), validateObjectId, ctrl.update);

module.exports = router;
