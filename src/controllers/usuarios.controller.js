const criarErro = require('../utils/criarErro');
const { podeAcessar } = require('../utils/acesso');
const usuarioModel = require('../models/usuario.model');
const tarefaModel = require('../models/tarefa.model');

async function listar(req, res) {
  res.json(
    (await usuarioModel.listar()).filter(
      (u) => req.usuario.administrador || u.id === req.usuario.id,
    ),
  );
}

async function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const usuario = await usuarioModel.buscar(id);
  if (!usuario || !podeAcessar(req.usuario, usuario, 'id')) {
    throw criarErro(404, 'Usuário não encontrado');
  }
  res.json(usuario);
}

async function criar(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome || !email) {
    throw criarErro(400, 'Nome e e-mail são obrigatórios');
  }

  const emailFormatado = email.trim().toLowerCase();
  if (await usuarioModel.buscarPorEmail(emailFormatado)) {
    throw criarErro(409, 'E-mail já cadastrado', ['Valor repetido em: email']);
  }

  const novoUsuario = await usuarioModel.adicionar({ nome, email: emailFormatado, senha });
  res.status(201).json(novoUsuario);
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  const usuarioExistente = await usuarioModel.buscar(id);
  if (!usuarioExistente || !podeAcessar(req.usuario, usuarioExistente, 'id')) {
    throw criarErro(404, 'Usuário não encontrado');
  }

  const { nome, email, senha } = req.body;
  if (!nome || !email) {
    throw criarErro(400, 'Nome e e-mail são obrigatórios');
  }

  const emailFormatado = email.trim().toLowerCase();
  const usuarioComEmail = await usuarioModel.buscarPorEmail(emailFormatado);
  if (usuarioComEmail && usuarioComEmail.id !== id) {
    throw criarErro(409, 'E-mail já cadastrado', ['Valor repetido em: email']);
  }

  const dados = { ...req.body, email: emailFormatado };
  const atualizado = await usuarioModel.atualizar(id, dados);
  if (!atualizado) throw criarErro(404, 'Usuário não encontrado');
  res.json(atualizado);
}

async function remover(req, res) {
  const id = Number(req.params.id);
  const usuario = await usuarioModel.buscar(id);
  if (!usuario || !podeAcessar(req.usuario, usuario, 'id')) {
    throw criarErro(404, 'Usuário não encontrado');
  }

  const tarefasDoUsuario = (await tarefaModel.listar()).filter((t) => t.usuarioId === id);
  if (tarefasDoUsuario.length > 0) {
    throw criarErro(409, 'Usuário possui tarefas. Remova as tarefas antes.');
  }

  if (!(await usuarioModel.remover(id))) throw criarErro(404, 'Usuário não encontrado');
  res.status(204).end();
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
};
