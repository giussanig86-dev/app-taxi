const router = require('express').Router();
const ctrl = require('../controllers/documenti.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

router.use(protect, authorize('cliente', 'consulente'), tenantGuard);

router.get('/', ctrl.getAll);
router.post('/upload', ctrl.uploadMiddleware, ctrl.upload);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.delete);

module.exports = router;
