// src/routes/projetos.routes.js

const express = require('express');
const router = express.Router();
const projetosController = require('../controllers/projetos.controller');
const tarefasController = require('../controllers/tarefas.controller');

router.get('/', projetosController.listar);
router.post('/', projetosController.criar);
router.get('/:id', projetosController.buscarPorId);
router.put('/:id', projetosController.atualizar);
router.delete('/:id', projetosController.remover);

// Rotas aninhadas -- tarefas de um projeto específico
// GET /projetos/:id/tarefas -- lista todas as tarefas do projeto
router.get('/:id/tarefas', tarefasController.listar);

module.exports = router;