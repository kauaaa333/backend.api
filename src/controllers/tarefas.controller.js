const tarefaModel = require('../models/tarefa.model');
const usuarioModel = require('../models/usuario.model');
const projetoModel = require('../models/projeto.model');

const COLUNAS_VALIDAS = ['afazer', 'andamento', 'concluido'];
const PRIORIDADES_VALIDAS = ['alta', 'media', 'baixa'];

function valorMaisComum(contagem) {
  const entradas = Object.entries(contagem);
  if (entradas.length === 0) return null;
  const ordenada = entradas.sort(([, a], [, b]) => b - a);
  return ordenada[0][1] > 0 ? ordenada[0][0] : null;
}

// Nível 1C -- Filtrar tarefas por query params (usuarioId, coluna, projetoId)
function listar(req, res) {
  const { usuarioId, coluna, projetoId } = req.query;
  const paramProjetoId = req.params && req.params.id ? req.params.id : null;

  let resultado = tarefaModel.listar();

  if (usuarioId !== undefined) {
    const uId = Number(usuarioId);
    resultado = resultado.filter((t) => t.usuarioId === uId);
  }

  if (coluna) {
    resultado = resultado.filter((t) => t.coluna === coluna);
  }

  const projId = paramProjetoId || projetoId;
  if (projId !== undefined && projId !== null) {
    const pId = Number(projId);
    resultado = resultado.filter((t) => t.projetoId === pId);
  }

  res.json(resultado);
}

function buscarPorId(req, res) {
  const id = Number(req.params.id);
  const tarefa = tarefaModel.buscar(id);
  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  res.json(tarefa);
}

// Base A, Base B, Nível 1A, Nível 1B
function criar(req, res) {
  const { texto, prioridade, coluna, usuarioId, projetoId } = req.body;

  // Validação: texto obrigatório
  if (!texto || (typeof texto === 'string' && !texto.trim())) {
    return res.status(400).json({ erro: 'Texto obrigatório' });
  }

  // Base B: validação de prioridade
  if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
    return res.status(400).json({ erro: 'Prioridade inválida. Use: alta, media ou baixa' });
  }

  // Base B: validação de coluna
  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) {
    return res.status(400).json({ erro: 'Coluna inválida. Use: afazer, andamento ou concluido' });
  }

  // Base A: validação de usuarioId
  let uId = null;
  if (usuarioId !== undefined && usuarioId !== null) {
    uId = Number(usuarioId);
    const usuario = usuarioModel.buscar(uId);
    if (!usuario) {
      return res.status(400).json({ erro: 'Usuário não encontrado' });
    }
  }

  // Validação de projetoId (se enviado)
  let pId = null;
  if (projetoId !== undefined && projetoId !== null) {
    pId = Number(projetoId);
    const projeto = projetoModel.buscar(pId);
    if (!projeto) {
      return res.status(400).json({ erro: 'Projeto não encontrado' });
    }
  }

  const colunaFinal = coluna || 'afazer';
  const prioridadeFinal = prioridade || 'media';

  // Nível 1A: limite de 2 tarefas em andamento por usuário
  if (colunaFinal === 'andamento' && uId !== null) {
    const tarefasEmAndamento = tarefaModel
      .listar()
      .filter((t) => t.usuarioId === uId && t.coluna === 'andamento').length;
    if (tarefasEmAndamento >= 2) {
      return res.status(400).json({ erro: 'Limite de 2 tarefas em andamento por usuário atingido' });
    }
  }

  // Nível 1B: data de conclusão automática
  const concluidaEm = colunaFinal === 'concluido' ? new Date().toISOString() : null;

  const novaTarefa = tarefaModel.adicionar({
    texto: texto.trim(),
    prioridade: prioridadeFinal,
    coluna: colunaFinal,
    usuarioId: uId,
    projetoId: pId,
    concluidaEm,
  });

  res.status(201).json(novaTarefa);
}

// Base B, Nível 1A, Nível 1B
function atualizar(req, res) {
  const id = Number(req.params.id);
  const tarefaExistente = tarefaModel.buscar(id);
  if (!tarefaExistente) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  const { texto, prioridade, coluna, usuarioId, projetoId } = req.body;

  // Base B: validação de prioridade
  if (prioridade !== undefined && !PRIORIDADES_VALIDAS.includes(prioridade)) {
    return res.status(400).json({ erro: 'Prioridade inválida. Use: alta, media ou baixa' });
  }

  // Base B: validação de coluna
  if (coluna !== undefined && !COLUNAS_VALIDAS.includes(coluna)) {
    return res.status(400).json({ erro: 'Coluna inválida. Use: afazer, andamento ou concluido' });
  }

  // Base A: validação de usuarioId
  let targetUsuarioId = tarefaExistente.usuarioId;
  if (usuarioId !== undefined) {
    if (usuarioId !== null) {
      const uId = Number(usuarioId);
      const usuario = usuarioModel.buscar(uId);
      if (!usuario) {
        return res.status(400).json({ erro: 'Usuário não encontrado' });
      }
      targetUsuarioId = uId;
    } else {
      targetUsuarioId = null;
    }
  }

  // Validação de projetoId
  let targetProjetoId = tarefaExistente.projetoId;
  if (projetoId !== undefined) {
    if (projetoId !== null) {
      const pId = Number(projetoId);
      const projeto = projetoModel.buscar(pId);
      if (!projeto) {
        return res.status(400).json({ erro: 'Projeto não encontrado' });
      }
      targetProjetoId = pId;
    } else {
      targetProjetoId = null;
    }
  }

  const targetColuna = coluna !== undefined ? coluna : tarefaExistente.coluna;

  // Nível 1A: limite de 2 tarefas em andamento por usuário
  if (targetColuna === 'andamento' && targetUsuarioId !== null) {
    const tarefasEmAndamento = tarefaModel
      .listar()
      .filter((t) => t.id !== id && t.usuarioId === targetUsuarioId && t.coluna === 'andamento').length;
    if (tarefasEmAndamento >= 2) {
      return res.status(400).json({ erro: 'Limite de 2 tarefas em andamento por usuário atingido' });
    }
  }

  // Nível 1B: data de conclusão automática
  let concluidaEm = tarefaExistente.concluidaEm;
  if (coluna !== undefined) {
    if (coluna === 'concluido') {
      concluidaEm = new Date().toISOString();
    } else {
      concluidaEm = null;
    }
  }

  const dadosAtualizacao = {
    ...(texto !== undefined ? { texto } : {}),
    ...(prioridade !== undefined ? { prioridade } : {}),
    ...(coluna !== undefined ? { coluna } : {}),
    ...(usuarioId !== undefined ? { usuarioId: targetUsuarioId } : {}),
    ...(projetoId !== undefined ? { projetoId: targetProjetoId } : {}),
    concluidaEm,
  };

  const tarefaAtualizada = tarefaModel.atualizar(id, dadosAtualizacao);
  res.json(tarefaAtualizada);
}

function remover(req, res) {
  const id = Number(req.params.id);
  const tarefa = tarefaModel.remover(id);
  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  res.json({ mensagem: 'Tarefa removida', tarefa });
}

// Nível 2A -- Estatísticas e Ranking de Usuários
function estatisticas(req, res) {
  const { coluna, projetoId } = req.query;
  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) {
    return res.status(400).json({ erro: 'Coluna inválida', colunasAceitas: COLUNAS_VALIDAS });
  }

  const todas = tarefaModel.listar();
  const tarefasFiltradas = (projetoId ? tarefaModel.listarPorProjeto(Number(projetoId)) : todas).filter(
    (t) => !coluna || t.coluna === coluna
  );

  const porColuna = {
    afazer: tarefasFiltradas.filter((t) => t.coluna === 'afazer').length,
    andamento: tarefasFiltradas.filter((t) => t.coluna === 'andamento').length,
    concluido: tarefasFiltradas.filter((t) => t.coluna === 'concluido').length,
  };

  const porPrioridade = {
    alta: tarefasFiltradas.filter((t) => t.prioridade === 'alta').length,
    media: tarefasFiltradas.filter((t) => t.prioridade === 'media').length,
    baixa: tarefasFiltradas.filter((t) => t.prioridade === 'baixa').length,
  };

  // Nível 2A: ranking de usuários
  const usuarios = usuarioModel.listar();
  const rankingUsuarios = usuarios
    .map((u) => ({
      usuarioId: u.id,
      nome: u.nome,
      totalTarefas: todas.filter((t) => t.usuarioId === u.id).length,
    }))
    .sort((a, b) => b.totalTarefas - a.totalTarefas);

  const usuarioComMaisTarefas =
    rankingUsuarios.length > 0 && rankingUsuarios[0].totalTarefas > 0 ? rankingUsuarios[0].nome : null;

  res.json({
    filtro: (coluna || projetoId) ? { coluna: coluna || null, projetoId: projetoId || null } : null,
    total: tarefasFiltradas.length,
    porColuna,
    porPrioridade,
    colunaComMaisTarefas: valorMaisComum(porColuna),
    prioridadeMaisComum: valorMaisComum(porPrioridade),
    usuarioComMaisTarefas,
    rankingUsuarios,
  });
}

function resumo(req, res) {
  const todas = tarefaModel.listar();
  const afazer = todas.filter((t) => t.coluna === 'afazer').length;
  const andamento = todas.filter((t) => t.coluna === 'andamento').length;
  const concluido = todas.filter((t) => t.coluna === 'concluido').length;
  const contagemPrioridade = {
    alta: todas.filter((t) => t.prioridade === 'alta').length,
    media: todas.filter((t) => t.prioridade === 'media').length,
    baixa: todas.filter((t) => t.prioridade === 'baixa').length,
  };
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
