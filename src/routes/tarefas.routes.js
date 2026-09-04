const express = require('express');
const tarefasController = require('../controllers/tarefas.controller');
const router = express.Router();

router.get('/estatisticas', tarefasController.estatisticas);
router.get('/resumo', tarefasController.resumo);
router.get('/', tarefasController.listar);
router.get('/:id', tarefasController.buscarPorId);
router.post('/', tarefasController.criar);
router.put('/:id', tarefasController.atualizar);
router.delete('/:id', tarefasController.remover);

module.exports = router;
