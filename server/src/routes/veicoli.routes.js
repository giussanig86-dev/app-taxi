const router = require('express').Router();
const ctrl = require('../controllers/veicoli.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

router.get('/',          ctrl.getAll);
router.get('/attivo',    ctrl.getAttivo);
router.post('/',         ctrl.create);
router.put('/:id',       ctrl.update);
router.post('/:id/storicizza', ctrl.storicizza);
router.delete('/:id',    ctrl.delete);

module.exports = router;
