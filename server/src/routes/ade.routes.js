const router = require('express').Router();
const ctrl   = require('../controllers/ade.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

router.use(protect);

// Stato connessione (consulente)
router.get('/status',   authorize('consulente'), ctrl.status);

// OAuth2 SPID flow
router.get('/auth-url', authorize('consulente'), ctrl.getAuthUrl);
router.get('/callback', ctrl.callback);          // redirect da AdE (no auth header)

// Gestione connessione
router.delete('/connection', authorize('consulente'), ctrl.disconnect);
router.patch('/settings',    authorize('consulente'), ctrl.updateSettings);

// Sincronizzazione automatica
router.post('/sync',              authorize('consulente'), ctrl.syncManuale);
router.post('/sync/:clienteId',   authorize('consulente'), validateObjectId, ctrl.syncCliente);

// Import manuale XML/ZIP FatturaPA
router.post('/import-xml', authorize('consulente'), ctrl.uploadXmlMiddleware, ctrl.importXml);

module.exports = router;
