// src/controllers/projetos.controller.js

const projetoModel = require('../models/projeto.model');

function listar(req, res) {
  res.json(projetoModel.listar());
}

function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const projeto = projetoModel.buscarPorId(id);
  if (!projeto) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }
  res.json(projeto);
}

function criar(req, res) {
  const { nome, descricao } = req.body;
  if (!nome) {
    return res.status(400).json({ erro: 'Nome obrigatório' });
  }
  if (projetoModel.buscarPorNome(nome)) {
    return res.status(400).json({ erro: 'Projeto já cadastrado' });
  }
  res.status(201).json(projetoModel.adicionar({ nome, descricao }));
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!projetoModel.buscarPorId(id)) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }
  const { nome, descricao } = req.body;
  const dados = { nome, descricao };
  res.json(projetoModel.atualizar(id, dados));
}

function remover(req, res) {
  const id = Number(req.params.id);
  const removido = projetoModel.remover(id);
  if (!removido) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }
  res.json({ mensagem: 'Projeto removido com sucesso', id: removido.id });
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };