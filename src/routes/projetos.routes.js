const express = require('express');
const router = express.Router();
const projetosController = require('../controllers/projetos.controller');
const tarefasController = require('../controllers/tarefas.controller');
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');
const idValido = validar(schemas.id, 'params');

router.get('/', projetosController.listar);
router.post('/', validar(schemas.projeto), projetosController.criar);
router.get('/:id/resumo', idValido, projetosController.resumo);
router.get('/:id/tarefas', idValido, validar(schemas.filtroTarefas, 'query'), tarefasController.listar);
router.get('/:id', idValido, projetosController.buscarPorId);
router.put('/:id', idValido, validar(schemas.projeto), projetosController.atualizar);
router.delete('/:id', idValido, projetosController.remover);

module.exports = router;
