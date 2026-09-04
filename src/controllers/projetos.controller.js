const projetoModel = require('../models/projeto.model');
const tarefaModel = require('../models/tarefa.model');

function listar(req, res) {
  res.json(projetoModel.listar());
}

function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const projeto = projetoModel.buscar(id);
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
  const novoProjeto = projetoModel.adicionar({ nome, descricao });
  res.status(201).json(novoProjeto);
}

function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!projetoModel.buscar(id)) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }
  const { nome, descricao } = req.body;
  if (nome) {
    const existente = projetoModel.buscarPorNome(nome);
    if (existente && existente.id !== id) {
      return res.status(400).json({ erro: 'Projeto já cadastrado' });
    }
  }
  const atualizado = projetoModel.atualizar(id, { nome, descricao });
  res.json(atualizado);
}

function remover(req, res) {
  const id = Number(req.params.id);
  const projeto = projetoModel.buscar(id);
  if (!projeto) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }

  // Nível 2B -- Proteger projeto com tarefas
  const tarefasDoProjeto = tarefaModel.listar().filter((t) => t.projetoId === id);
  if (tarefasDoProjeto.length > 0) {
    return res.status(400).json({ erro: 'Projeto possui tarefas associadas.' });
  }

  const removido = projetoModel.remover(id);
  res.json({ mensagem: 'Projeto removido com sucesso', id: removido.id, projeto: removido });
}

// Nível 2C -- Resumo do projeto: GET /projetos/:id/resumo
function resumo(req, res) {
  const id = Number(req.params.id);
  const projeto = projetoModel.buscar(id);
  if (!projeto) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }

  const tarefas = tarefaModel.listar().filter((t) => t.projetoId === id);
  const porColuna = {
    afazer: tarefas.filter((t) => t.coluna === 'afazer').length,
    andamento: tarefas.filter((t) => t.coluna === 'andamento').length,
    concluido: tarefas.filter((t) => t.coluna === 'concluido').length,
  };

  res.json({
    projeto,
    totalTarefas: tarefas.length,
    porColuna,
  });
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  resumo,
};
