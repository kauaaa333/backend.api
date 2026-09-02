// src/models/tarefa.model.js

const projetoModel = require('./projeto.model');

// Dados em memória -- substitui o banco por enquanto
let tarefas = [
  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer', projetoId: 1 },
  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento', projetoId: 1 },
  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido', projetoId: 2 },
];
let proximoId = 4;

function listar() {
  return tarefas;
}

function listarPorProjeto(projetoId) {
  return tarefas.filter((tarefa) => tarefa.projetoId === projetoId);
}

function buscarPorId(id) {
  return tarefas.find((tarefa) => tarefa.id === id);
}

function adicionar({ texto, prioridade = 'media', coluna = 'afazer', projetoId }) {
  if (!projetoId || !projetoModel.buscarPorId(projetoId)) {
    throw new Error('Projeto inválido');
  }
  const novaTarefa = { id: proximoId++, texto, prioridade, coluna, projetoId };
  tarefas.push(novaTarefa);
  return novaTarefa;
}

function atualizar(id, { texto, prioridade, coluna, projetoId }) {
  const indice = tarefas.findIndex((tarefa) => tarefa.id === id);
  if (indice === -1) {
    return null;
  }
  if (projetoId && !projetoModel.buscarPorId(projetoId)) {
    throw new Error('Projeto inválido');
  }
  const tarefa = { id, texto, prioridade, coluna, projetoId: projetoId ?? tarefas[indice].projetoId };
  tarefas[indice] = tarefa;
  return tarefa;
}

function remover(id) {
  const indice = tarefas.findIndex((tarefa) => tarefa.id === id);
  return indice === -1 ? null : tarefas.splice(indice, 1)[0];
}

function listarPorColuna(coluna) {
  return tarefas.filter((tarefa) => tarefa.coluna === coluna);
}

module.exports = { listar, listarPorProjeto, buscarPorId, adicionar, atualizar, remover, listarPorColuna };