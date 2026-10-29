const autenticar = require('../middlewares/autenticar');
const validar = require('../middlewares/validar');
const schemas = require('../middlewares/schemas');
const idValido = validar(schemas.id, 'params');
const criarErro = require('../utils/criarErro');
const router = require('express').Router();
const comentarios = require('../models/comentario.model');
const tarefas = require('../models/tarefa.model');
router.get('/tarefas/:id/comentarios', autenticar, idValido, async (req, res) => {
  const tarefa = await tarefas.buscarAcessivel(Number(req.params.id), req.usuario);
  if (!tarefa) throw criarErro(404, 'Tarefa não encontrada');
  res.json(await comentarios.listarPorTarefa(tarefa.id));
});
router.post('/tarefas/:id/comentarios', autenticar, idValido, async (req, res) => {
  const tarefa = await tarefas.buscarAcessivel(Number(req.params.id), req.usuario);
  if (!tarefa) throw criarErro(404, 'Tarefa não encontrada');
  const { texto } = req.body || {};
  if (typeof texto !== 'string' || !texto.trim())
    throw criarErro(400, 'Texto obrigatório');
  res
    .status(201)
    .json(
      await comentarios.adicionar({
        texto: texto.trim(),
        tarefaId: tarefa.id,
        usuarioId: req.usuario.id,
      }),
    );
});
router.delete('/comentarios/:id', autenticar, idValido, async (req, res) => {
  const comentario = await comentarios.buscar(Number(req.params.id));
  if (!comentario) throw criarErro(404, 'Comentário não encontrado');
  if (comentario.usuarioId !== req.usuario.id && !req.usuario.administrador)
    throw criarErro(403, 'Somente o autor pode remover o comentário');
  if (!(await comentarios.remover(comentario.id))) throw criarErro(404, 'Comentário não encontrado');
  res.status(204).end();
});
module.exports = router;
