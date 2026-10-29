const criarErro = require('../utils/criarErro');
const { podeAcessar } = require('../utils/acesso');
const projetoModel = require('../models/projeto.model');
const tarefaModel = require('../models/tarefa.model');

async function listar(req, res) {
  res.json((await projetoModel.listar()).filter((p) => podeAcessar(req.usuario, p)));
}

async function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const projeto = await projetoModel.buscar(id);
  if (!podeAcessar(req.usuario, projeto)) {
    throw criarErro(404, 'Projeto não encontrado');
  }
  res.json(projeto);
}

async function criar(req, res) {
  const { nome, descricao } = req.body;
  if (!nome) {
    throw criarErro(400, 'Nome obrigatório');
  }
  if (await projetoModel.buscarPorNome(nome)) {
    throw criarErro(409, 'Projeto já cadastrado', ['Valor repetido em: nome']);
  }
  const novoProjeto = await projetoModel.adicionar({
    nome: nome.trim(),
    descricao,
    usuarioId: req.usuario.id,
  });
  res.status(201).json(novoProjeto);
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!podeAcessar(req.usuario, await projetoModel.buscar(id))) {
    throw criarErro(404, 'Projeto não encontrado');
  }
  const { nome, descricao } = req.body;
  if (nome) {
    const existente = await projetoModel.buscarPorNome(nome);
    if (existente && existente.id !== id) {
      throw criarErro(409, 'Projeto já cadastrado', ['Valor repetido em: nome']);
    }
  }
  const atualizado = await projetoModel.atualizar(id, { nome, descricao });
  if (!atualizado) throw criarErro(404, 'Projeto não encontrado');
  res.json(atualizado);
}

async function remover(req, res) {
  const id = Number(req.params.id);
  const projeto = await projetoModel.buscar(id);
  if (!podeAcessar(req.usuario, projeto)) {
    throw criarErro(404, 'Projeto não encontrado');
  }

  const tarefasDoProjeto = (await tarefaModel.listar()).filter((t) => t.projetoId === id);
  if (tarefasDoProjeto.length > 0) {
    throw criarErro(409, 'Projeto possui tarefas associadas.');
  }

  if (!(await projetoModel.remover(id))) throw criarErro(404, 'Projeto não encontrado');
  res.status(204).end();
}

async function resumo(req, res) {
  const id = Number(req.params.id);
  const projeto = await projetoModel.buscar(id);
  if (!podeAcessar(req.usuario, projeto)) {
    throw criarErro(404, 'Projeto não encontrado');
  }

  const tarefas = (await tarefaModel.listar()).filter((t) => t.projetoId === id);
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
