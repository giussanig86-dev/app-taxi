const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validateLogin, validateChangePassword } = require('../middleware/validate');

router.post('/login', validateLogin, authController.login);
router.get('/me', protect, authController.getMe);
router.put('/password', protect, validateChangePassword, authController.changePassword);

module.exports = router;
