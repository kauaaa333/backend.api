const express = require('express');
const prioridadesController = require('../controllers/prioridades.controller');
const router = express.Router();

router.get('/', prioridadesController.listar);

module.exports = router;
