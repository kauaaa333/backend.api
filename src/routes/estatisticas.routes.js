const express = require('express');
const tarefasController = require('../controllers/tarefas.controller');
const router = express.Router();
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');

router.get('/', validar(schemas.filtroTarefas, 'query'), tarefasController.estatisticas);
router.get('/resumo', tarefasController.resumo);

module.exports = router;
