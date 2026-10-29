const campos = {
  usuario_id: 'usuarioId',
  tarefa_id: 'tarefaId',
  projeto_id: 'projetoId',
  criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm',
  iniciada_em: 'iniciadaEm',
  concluida_em: 'concluidaEm',
};

module.exports = function formatar(registro) {
  if (!registro) return null;
  return Object.fromEntries(
    Object.entries(registro).map(([chave, valor]) => {
      if (chave === 'usuarios') return ['usuario', valor?.nome ?? null];
      if (chave === 'projetos') return ['projeto', valor?.nome ?? null];
      if (chave === 'prioridades')
        return ['prioridade', valor?.descricao ?? null];
      return [campos[chave] || chave, valor];
    }),
  );
};
