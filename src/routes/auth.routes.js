const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const autenticar = require('../middlewares/autenticar');

router.post('/login', authController.login);
router.get('/perfil', autenticar, authController.perfil);

module.exports = router;
