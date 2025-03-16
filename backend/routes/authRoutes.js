const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { loginValidation, changePasswordValidation, forgotPasswordValidation, resetPasswordValidation } = require('../utils/validators');


router.post('/login', loginValidation, authController.login);


router.get('/me', authenticateJWT, authController.getCurrentUser);


router.post('/change-password', authenticateJWT, changePasswordValidation, authController.changePassword);


router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);


router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

module.exports = router;

 