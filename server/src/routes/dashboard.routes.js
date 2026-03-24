const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

router.get('/cliente', protect, authorize('cliente', 'consulente'), tenantGuard, ctrl.dashboardCliente);
router.get('/consulente', protect, authorize('consulente'), ctrl.dashboardConsulente);

module.exports = router;
