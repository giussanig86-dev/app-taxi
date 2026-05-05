const router = require('express').Router();
const ctrl   = require('../controllers/ade.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('consulente'));

// Stato connessione
router.get('/status', ctrl.status);

// Gestione certificato CNS
router.post('/certificato', ctrl.uploadCertMiddleware, ctrl.uploadCertificato);
router.delete('/connection', ctrl.disconnect);
router.patch('/settings',    ctrl.updateSettings);

module.exports = router;
