const usuarioModel = require('../models/usuario.model');
const tarefaModel = require('../models/tarefa.model');

function listar(req, res) {
  res.json(usuarioModel.listar());
}

function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const usuario = usuarioModel.buscar(id);
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }
  res.json(usuario);
}

function criar(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios' });
  }

  const emailFormatado = email.trim().toLowerCase();
  if (usuarioModel.buscarPorEmail(emailFormatado)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const novoUsuario = usuarioModel.adicionar({ nome, email: emailFormatado, senha });
  res.status(201).json(novoUsuario);
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  const usuarioExistente = usuarioModel.buscar(id);
  if (!usuarioExistente) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const { nome, email, senha } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios' });
  }

  const emailFormatado = email.trim().toLowerCase();
  const usuarioComEmail = usuarioModel.buscarPorEmail(emailFormatado);
  if (usuarioComEmail && usuarioComEmail.id !== id) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const dados = { ...req.body, email: emailFormatado };
  const atualizado = usuarioModel.atualizar(id, dados);
  res.json(atualizado);
}

function remover(req, res) {
  const id = Number(req.params.id);
  const usuario = usuarioModel.buscar(id);
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  // Base C -- Não permitir deletar usuário que tem tarefas associadas
  const tarefasDoUsuario = tarefaModel.listar().filter((t) => t.usuarioId === id);
  if (tarefasDoUsuario.length > 0) {
    return res.status(400).json({ erro: 'Usuário possui tarefas. Remova as tarefas antes.' });
  }

  const removido = usuarioModel.remover(id);
  res.json({ mensagem: 'Usuário removido com sucesso', id: removido.id, usuario: removido });
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
};
