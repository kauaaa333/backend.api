const express = require('express');
const tarefasController = require('../controllers/tarefas.controller');
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');
const router = express.Router();
const idValido = validar(schemas.id, 'params');

router.get('/estatisticas', validar(schemas.filtroTarefas, 'query'), tarefasController.estatisticas);
router.get('/resumo', tarefasController.resumo);
router.get('/', validar(schemas.filtroTarefas, 'query'), tarefasController.listar);
router.get('/:id', idValido, tarefasController.buscarPorId);
router.post('/', validar(schemas.tarefa), tarefasController.criar);
router.put('/:id', idValido, validar(schemas.tarefa), tarefasController.atualizar);
router.delete('/:id', idValido, tarefasController.remover);

module.exports = router;
