const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Profilo (tutti i ruoli autenticati)
router.get('/profilo', ctrl.getProfilo);
router.put('/profilo', ctrl.updateProfilo);
router.put('/profilo/fiscale', authorize('cliente'), ctrl.updateDatiFiscali);

// Gestione clienti (solo consulenti)
router.get('/clienti', authorize('consulente'), ctrl.getClienti);
router.post('/clienti', authorize('consulente'), ctrl.createCliente);
router.get('/clienti/:id', authorize('consulente'), ctrl.getCliente);
router.put('/clienti/:id', authorize('consulente'), ctrl.updateCliente);
router.put('/clienti/:id/stato', authorize('consulente'), ctrl.cambiaStato);
router.get('/clienti/:id/stato/storico', authorize('consulente'), ctrl.getStoricoStato);

module.exports = router;
