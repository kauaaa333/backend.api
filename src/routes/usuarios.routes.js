const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');
const router = express.Router();
const idValido = validar(schemas.id, 'params');

router.get('/', usuariosController.listar);
router.get('/:id', idValido, usuariosController.buscarPorId);
router.post('/', validar(schemas.usuario), usuariosController.criar);
router.put('/:id', idValido, validar(schemas.usuario), usuariosController.atualizar);
router.delete('/:id', idValido, usuariosController.remover);

module.exports = router;
