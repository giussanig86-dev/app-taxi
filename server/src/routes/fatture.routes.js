const router = require('express').Router();
const ctrl = require('../controllers/fatture.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

router.use(protect, authorize('cliente', 'consulente', 'super_admin'));

// Lettura
router.get('/',    ctrl.getAll);
router.get('/:id', validateObjectId, ctrl.getOne);

// La taxi app può scrivere solo stato e corsaId (il resto lo gestisce il gestionale fatture)
router.patch('/:id/stato', validateObjectId, ctrl.updateStato);
router.patch('/:id/corsa', validateObjectId, ctrl.updateCorsaId);

module.exports = router;
