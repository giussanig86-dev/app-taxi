const router = require('express').Router();
const ctrl = require('../controllers/notifiche.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('consulente'));

router.get('/',                      ctrl.getAll);
router.patch('/leggi-tutte',         ctrl.segnaLetteTutte);
router.patch('/:id/letta',           ctrl.segnaLetta);
router.delete('/:id',                ctrl.delete);

module.exports = router;
