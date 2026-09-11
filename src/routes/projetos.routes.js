const express = require('express');
const router = express.Router();
const projetosController = require('../controllers/projetos.controller');
const tarefasController = require('../controllers/tarefas.controller');
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');

router.get('/', projetosController.listar);
router.post('/', validar(schemas.projeto), projetosController.criar);
router.get('/:id/resumo', projetosController.resumo);
router.get('/:id/tarefas', tarefasController.listar);
router.get('/:id', projetosController.buscarPorId);
router.put('/:id', validar(schemas.projeto), projetosController.atualizar);
router.delete('/:id', projetosController.remover);

module.exports = router;
