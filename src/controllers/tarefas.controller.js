// src/controllers/tarefas.controller.js

const tarefaModel = require('../models/tarefa.model');
const COLUNAS_VALIDAS = ['afazer', 'andamento', 'concluido'];
const PRIORIDADES_VALIDAS = ['alta', 'media', 'baixa'];
function contarPor(campo, itens) { return itens.reduce((contagem, item) => { contagem[item[campo]] = (contagem[item[campo]] || 0) + 1; return contagem; }, {}); }
function valorMaisComum(contagem) { const entradas = Object.entries(contagem); return entradas.length === 0 ? null : entradas.sort(([, a], [, b]) => b - a)[0][0]; }
function calcularEstatisticas(itens) { const porColuna = Object.fromEntries(COLUNAS_VALIDAS.map((coluna) => [coluna, 0])); const porPrioridade = Object.fromEntries(PRIORIDADES_VALIDAS.map((prioridade) => [prioridade, 0])); Object.assign(porColuna, contarPor('coluna', itens)); Object.assign(porPrioridade, contarPor('prioridade', itens)); return { total: itens.length, porColuna, porPrioridade, colunaComMaisTarefas: valorMaisComum(porColuna), prioridadeMaisComum: valorMaisComum(porPrioridade) }; }
function listar(req, res) {
  const { projetoId } = req.query;
  const tarefas = projetoId ? tarefaModel.listarPorProjeto(Number(projetoId)) : tarefaModel.listar();
  res.json(tarefas);
}

function buscarPorId(req, res) {
  const tarefa = tarefaModel.buscarPorId(Number(req.params.id));
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  res.json(tarefa);
}

function criar(req, res) {
  try {
    res.status(201).json(tarefaModel.adicionar(req.body));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

function atualizar(req, res) {
  try {
    const tarefa = tarefaModel.atualizar(Number(req.params.id), req.body);
    if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    res.json(tarefa);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

function remover(req, res) {
  const tarefa = tarefaModel.remover(Number(req.params.id));
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada' });
  res.json({ mensagem: 'Tarefa removida com sucesso', id: tarefa.id });
}

function estatisticas(req, res) {
  const { coluna, projetoId } = req.query;
  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) return res.status(400).json({ erro: 'Coluna inválida', colunasAceitas: COLUNAS_VALIDAS });
  const tarefas = (projetoId ? tarefaModel.listarPorProjeto(Number(projetoId)) : tarefaModel.listar()).filter((t) => !coluna || t.coluna === coluna);
  res.json({ filtro: { coluna: coluna || null, projetoId: projetoId || null }, ...calcularEstatisticas(tarefas) });
}

function resumo(req, res) {
  const { total, porColuna, prioridadeMaisComum } = calcularEstatisticas(tarefaModel.listar());
  res.json({ resumo: `Você tem ${total} tarefa(s). ${porColuna.concluido} concluída(s), ${porColuna.andamento} em andamento e ${porColuna.afazer} a fazer. Prioridade mais comum: ${prioridadeMaisComum || 'nenhuma'}.` });
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, estatisticas, resumo };