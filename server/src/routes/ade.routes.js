const router = require('express').Router();
const ctrl   = require('../controllers/ade.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

router.use(protect);
router.use(authorize('consulente'));

// Stato connessione
router.get('/status', ctrl.status);

// Gestione certificato CNS
router.post('/certificato', ctrl.uploadCertMiddleware, ctrl.uploadCertificato);
router.delete('/connection', ctrl.disconnect);
router.patch('/settings',    ctrl.updateSettings);

// Sincronizzazione automatica
router.post('/sync',             ctrl.syncManuale);
router.post('/sync/:clienteId',  validateObjectId, ctrl.syncCliente);

// Import manuale XML/P7M/ZIP FatturaPA
router.post('/import-xml', ctrl.uploadXmlMiddleware, ctrl.importXml);

module.exports = router;
