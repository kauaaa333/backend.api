const criarErro = require('../utils/criarErro');
const { podeAcessar } = require('../utils/acesso');
const tarefaModel = require('../models/tarefa.model');
const usuarioModel = require('../models/usuario.model');
const projetoModel = require('../models/projeto.model');
const prioridadeModel = require('../models/prioridade.model');

const COLUNAS_VALIDAS = ['afazer', 'andamento', 'concluido'];
const MSG_PRIORIDADE_INVALIDA =
  'Prioridade inválida. Use o id de uma prioridade ativa (GET /prioridades)';

// idprioridade é chave estrangeira para prioridades: precisa existir e estar ativa.
// Na edição, a prioridade atual da tarefa continua aceita mesmo se tiver sido desativada.
async function prioridadeValida(idprioridade, idAtual = null) {
  const prioridade = Number.isInteger(idprioridade)
    ? await prioridadeModel.buscar(idprioridade)
    : null;
  if (!prioridade) return false;
  return prioridade.ativo || prioridade.id === idAtual;
}

// Compatibilidade: clientes antigos ainda enviam o texto 'prioridade' ('alta', 'media'...).
// Converte para o id; texto desconhecido vira NaN e é recusado por prioridadeValida.
async function idPrioridadeDoCorpo(body) {
  if (body.idprioridade !== undefined || typeof body.prioridade !== 'string')
    return body.idprioridade;
  const descricao = body.prioridade.trim().toLowerCase();
  const prioridade = (await prioridadeModel.listar()).find((p) => p.descricao === descricao);
  return prioridade ? prioridade.id : NaN;
}

// Contagem por descrição, da mais importante para a menos (desempate favorece a mais importante)
async function contarPorPrioridade(tarefas) {
  const prioridades = [...(await prioridadeModel.listarTodas())].sort((a, b) => b.id - a.id);
  return Object.fromEntries(
    prioridades.map((p) => [p.descricao, tarefas.filter((t) => t.idprioridade === p.id).length]),
  );
}

function valorMaisComum(contagem) {
  const entradas = Object.entries(contagem);
  if (entradas.length === 0) return null;
  const ordenada = entradas.sort(([, a], [, b]) => b - a);
  return ordenada[0][1] > 0 ? ordenada[0][0] : null;
}

async function listar(req, res) {
  const { usuarioId, coluna, projetoId } = req.query;
  const projetoIdDaRota = req.params && req.params.id ? req.params.id : null;
  if (
    projetoIdDaRota &&
    !podeAcessar(req.usuario, await projetoModel.buscar(Number(projetoIdDaRota)))
  )
    throw criarErro(404, 'Projeto não encontrado');

  let resultado = await tarefaModel.listarAcessiveis(req.usuario);

  if (usuarioId !== undefined) {
    const idUsuario = Number(usuarioId);
    resultado = resultado.filter((t) => t.usuarioId === idUsuario);
  }

  if (coluna) {
    resultado = resultado.filter((t) => t.coluna === coluna);
  }

  const filtroProjetoId = projetoIdDaRota || projetoId;
  if (filtroProjetoId !== undefined && filtroProjetoId !== null) {
    const idProjeto = Number(filtroProjetoId);
    resultado = resultado.filter((t) => t.projetoId === idProjeto);
  }

  res.json(resultado);
}

async function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const tarefa = await tarefaModel.buscarAcessivel(id, req.usuario);
  if (!tarefa) {
    throw criarErro(404, 'Tarefa não encontrada');
  }
  res.json(tarefa);
}

async function criar(req, res) {
  const { texto, coluna, usuarioId, projetoId, ordem } = req.body;
  const idprioridade = await idPrioridadeDoCorpo(req.body);

  if (!texto || (typeof texto === 'string' && !texto.trim())) {
    throw criarErro(400, 'Texto obrigatório');
  }

  if (
    idprioridade !== undefined &&
    idprioridade !== null &&
    !(await prioridadeValida(idprioridade))
  ) {
    throw criarErro(400, MSG_PRIORIDADE_INVALIDA);
  }

  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (!req.usuario.administrador && usuarioId != null && usuarioId !== req.usuario.id)
    throw criarErro(403, 'Não é permitido atribuir a tarefa a outro usuário');
  let idUsuario = req.usuario.id;
  if (usuarioId !== undefined && usuarioId !== null) {
    idUsuario = Number(usuarioId);
    const usuario = await usuarioModel.buscar(idUsuario);
    if (!usuario) {
      throw criarErro(400, 'Usuário não encontrado');
    }
  }

  let idProjeto = null;
  if (projetoId !== undefined && projetoId !== null) {
    idProjeto = Number(projetoId);
    const projeto = await projetoModel.buscar(idProjeto);
    if (!projeto || !podeAcessar(req.usuario, projeto)) {
      throw criarErro(400, 'Projeto não encontrado');
    }
  }

  const colunaFinal = coluna || 'afazer';
  // Sem prioridade informada: padrão 'media', igual ao DEFAULT 3 do banco
  const prioridadeFinal = idprioridade ?? prioridadeModel.ID_PADRAO;
  if (!(await prioridadeValida(prioridadeFinal)))
    throw criarErro(400, MSG_PRIORIDADE_INVALIDA);

  if (colunaFinal === 'andamento' && idUsuario !== null) {
    const tarefasEmAndamento = (await tarefaModel.listarAcessiveis(req.usuario)).filter(
      (t) => t.usuarioId === idUsuario && t.coluna === 'andamento',
    ).length;
    if (tarefasEmAndamento >= 2) {
      throw criarErro(400, 'Limite de 2 tarefas em andamento por usuário atingido');
    }
  }

  const novaTarefa = await tarefaModel.adicionar(
    {
      texto: texto.trim(),
      idprioridade: prioridadeFinal,
      coluna: colunaFinal,
      usuarioId: idUsuario,
      projetoId: idProjeto,
      ordem,
    },
    req.usuario,
  );

  res.status(201).json(novaTarefa);
}

async function atualizar(req, res) {
  const id = Number(req.params.id);
  const tarefaExistente = await tarefaModel.buscarAcessivel(id, req.usuario);
  if (!tarefaExistente) {
    throw criarErro(404, 'Tarefa não encontrada');
  }

  const { texto, coluna, usuarioId, projetoId, ordem } = req.body;
  const idprioridade = await idPrioridadeDoCorpo(req.body);

  if (
    idprioridade !== undefined &&
    !(await prioridadeValida(idprioridade, tarefaExistente.idprioridade))
  ) {
    throw criarErro(400, MSG_PRIORIDADE_INVALIDA);
  }

  if (coluna !== undefined && !COLUNAS_VALIDAS.includes(coluna)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (!req.usuario.administrador && usuarioId !== undefined && usuarioId !== req.usuario.id)
    throw criarErro(403, 'Não é permitido atribuir a tarefa a outro usuário');
  let usuarioIdAtualizado = tarefaExistente.usuarioId ?? req.usuario.id;
  if (usuarioId !== undefined) {
    if (usuarioId !== null) {
      const idUsuario = Number(usuarioId);
      const usuario = await usuarioModel.buscar(idUsuario);
      if (!usuario) {
        throw criarErro(400, 'Usuário não encontrado');
      }
      usuarioIdAtualizado = idUsuario;
    } else {
      usuarioIdAtualizado = null;
    }
  }

  let projetoIdAtualizado = tarefaExistente.projetoId;
  if (projetoId !== undefined) {
    if (projetoId !== null) {
      const idProjeto = Number(projetoId);
      const projeto = await projetoModel.buscar(idProjeto);
      if (!projeto || !podeAcessar(req.usuario, projeto)) {
        throw criarErro(400, 'Projeto não encontrado');
      }
      projetoIdAtualizado = idProjeto;
    } else {
      projetoIdAtualizado = null;
    }
  }

  const colunaAtualizada = coluna !== undefined ? coluna : tarefaExistente.coluna;

  if (colunaAtualizada === 'andamento' && usuarioIdAtualizado !== null) {
    const tarefasEmAndamento = (await tarefaModel.listarAcessiveis(req.usuario)).filter(
      (t) => t.id !== id && t.usuarioId === usuarioIdAtualizado && t.coluna === 'andamento',
    ).length;
    if (tarefasEmAndamento >= 2) {
      throw criarErro(400, 'Limite de 2 tarefas em andamento por usuário atingido');
    }
  }

  const dadosAtualizacao = {
    ...(texto !== undefined ? { texto } : {}),
    ...(idprioridade !== undefined ? { idprioridade } : {}),
    ...(coluna !== undefined ? { coluna } : {}),
    ...(usuarioId !== undefined || tarefaExistente.usuarioId === null
      ? { usuarioId: usuarioIdAtualizado }
      : {}),
    ...(projetoId !== undefined ? { projetoId: projetoIdAtualizado } : {}),
    ...(ordem !== undefined ? { ordem } : {}),
  };

  const tarefaAtualizada = await tarefaModel.atualizar(id, dadosAtualizacao, req.usuario);
  if (!tarefaAtualizada) throw criarErro(404, 'Tarefa não encontrada');
  res.json(tarefaAtualizada);
}

async function remover(req, res) {
  const id = Number(req.params.id);
  const tarefa = await tarefaModel.remover(id, req.usuario);
  if (!tarefa) {
    throw criarErro(404, 'Tarefa não encontrada');
  }
  res.status(204).end();
}

async function estatisticas(req, res) {
  const { coluna, projetoId, usuarioId } = req.query;
  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) {
    throw criarErro(400, 'Coluna inválida');
  }

  const todas = await tarefaModel.listarAcessiveis(req.usuario);
  const tarefasFiltradas = todas.filter(
    (t) => (!coluna || t.coluna === coluna)
      && (!projetoId || t.projetoId === Number(projetoId))
      && (!usuarioId || t.usuarioId === Number(usuarioId)),
  );

  const porColuna = {
    afazer: tarefasFiltradas.filter((t) => t.coluna === 'afazer').length,
    andamento: tarefasFiltradas.filter((t) => t.coluna === 'andamento').length,
    concluido: tarefasFiltradas.filter((t) => t.coluna === 'concluido').length,
  };

  const porPrioridade = await contarPorPrioridade(tarefasFiltradas);

  const usuarios = (await usuarioModel.listar()).filter(
    (u) => req.usuario.administrador || u.id === req.usuario.id,
  );
  const rankingUsuarios = usuarios
    .map((u) => ({
      usuarioId: u.id,
      nome: u.nome,
      totalTarefas: tarefasFiltradas.filter((t) => t.usuarioId === u.id).length,
    }))
    .sort((a, b) => b.totalTarefas - a.totalTarefas);

  const usuarioComMaisTarefas =
    rankingUsuarios.length > 0 && rankingUsuarios[0].totalTarefas > 0
      ? rankingUsuarios[0].nome
      : null;

  res.json({
    filtro: coluna || projetoId || usuarioId
      ? { coluna: coluna || null, projetoId: projetoId || null, ...(usuarioId ? { usuarioId } : {}) }
      : null,
    total: tarefasFiltradas.length,
    porColuna,
    porPrioridade,
    colunaComMaisTarefas: valorMaisComum(porColuna),
    prioridadeMaisComum: valorMaisComum(porPrioridade),
    usuarioComMaisTarefas,
    rankingUsuarios,
  });
}

async function resumo(req, res) {
  const todas = await tarefaModel.listarAcessiveis(req.usuario);
  const afazer = todas.filter((t) => t.coluna === 'afazer').length;
  const andamento = todas.filter((t) => t.coluna === 'andamento').length;
  const concluido = todas.filter((t) => t.coluna === 'concluido').length;
  const contagemPrioridade = await contarPorPrioridade(todas);
  const prioridadeMaisComum = valorMaisComum(contagemPrioridade);

  res.json({
    resumo: `Você tem ${todas.length} tarefa(s). ${concluido} concluída(s), ${andamento} em andamento e ${afazer} a fazer. Prioridade mais comum: ${prioridadeMaisComum || 'nenhuma'}.`,
  });
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  estatisticas,
  resumo,
};
