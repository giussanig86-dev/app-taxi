const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('super_admin'));

router.get('/stats', ctrl.getStats);

router.get('/consulenti', ctrl.getConsulenti);
router.post('/consulenti', ctrl.createConsulente);
router.get('/consulenti/:id', ctrl.getConsulente);
router.put('/consulenti/:id', ctrl.updateConsulente);
router.patch('/consulenti/:id/sospensione', ctrl.toggleSospensione);
router.delete('/consulenti/:id', ctrl.deleteConsulente);

module.exports = router;
