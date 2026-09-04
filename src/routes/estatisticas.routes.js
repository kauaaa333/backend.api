const express = require('express');
const tarefasController = require('../controllers/tarefas.controller');
const router = express.Router();

router.get('/', tarefasController.estatisticas);
router.get('/resumo', tarefasController.resumo);

module.exports = router;
