const { id, data, parametroId, lista, operacao: op, filtros } = require('./comum');
const propriedades = {
  texto: { type: 'string', minLength: 1, example: 'Revisar layout' },
  coluna: { type: 'string', enum: ['afazer', 'andamento', 'concluido'], default: 'afazer' },
  idprioridade: { ...id, default: 3, description: 'ID de prioridade ativa (GET /prioridades). A atual pode ser mantida na edição mesmo se inativa.' },
  usuarioId: { ...id, nullable: true, description: 'Padrão: conta autenticada. Somente administrador pode atribuir a outra pessoa.' },
  projetoId: { ...id, nullable: true, description: 'Opcional; precisa ser acessível à conta.' },
  ordem: { type: 'integer', minimum: 0, maximum: 2147483647, default: 0 },
};
const entrada = { type: 'object', properties: propriedades };
module.exports = {
  schemas: {
    TarefaEntrada: { ...entrada, required: ['texto'] },
    TarefaAtualizacao: { ...entrada, minProperties: 1, description: 'PUT parcial: envie pelo menos um campo reconhecido. Campos omitidos são preservados.' },
    Tarefa: { type: 'object', properties: { id, ...propriedades,
      usuario: { type: 'string', nullable: true }, projeto: { type: 'string', nullable: true }, prioridade: { type: 'string' },
      criadoEm: data, atualizadoEm: data, iniciadaEm: { ...data, nullable: true }, concluidaEm: { ...data, nullable: true },
    } },
    ResumoTarefas: { type: 'object', properties: { resumo: { type: 'string' } } },
    Estatisticas: { type: 'object', properties: {
      filtro: { type: 'object', nullable: true, additionalProperties: true }, total: { type: 'integer' },
      porColuna: { type: 'object', additionalProperties: { type: 'integer' } },
      porPrioridade: { type: 'object', additionalProperties: { type: 'integer' } },
      colunaComMaisTarefas: { type: 'string', nullable: true }, prioridadeMaisComum: { type: 'string', nullable: true },
      usuarioComMaisTarefas: { type: 'string', nullable: true },
      rankingUsuarios: { type: 'array', items: { type: 'object', properties: { usuarioId: id, nome: { type: 'string' }, totalTarefas: { type: 'integer' } } } },
    } },
  },
  paths: {
    '/tarefas': {
      get: op('Tarefas', 'Lista tarefas acessíveis à conta', lista('Tarefa'), { parameters: filtros }),
      post: op('Tarefas', 'Cria uma tarefa', 'Tarefa', { status: 201, body: 'TarefaEntrada', description: 'Máximo de duas tarefas em andamento por responsável. Datas e auditoria são controladas pelo banco.' }),
    },
    '/tarefas/{id}': {
      get: op('Tarefas', 'Busca uma tarefa acessível', 'Tarefa', { parameters: [parametroId] }),
      put: op('Tarefas', 'Atualiza parcialmente uma tarefa', 'Tarefa', { parameters: [parametroId], body: 'TarefaAtualizacao' }),
      delete: op('Tarefas', 'Exclui uma tarefa e seus comentários', null, { parameters: [parametroId], status: 204 }),
    },
    ...Object.fromEntries(['/tarefas/estatisticas', '/estatisticas'].map(path => [path, {
      get: op('Estatísticas', 'Estatísticas das tarefas acessíveis', 'Estatisticas', { parameters: filtros }),
    }])),
    ...Object.fromEntries(['/tarefas/resumo', '/estatisticas/resumo'].map(path => [path, {
      get: op('Estatísticas', 'Resumo textual das tarefas acessíveis', 'ResumoTarefas'),
    }])),
  },
};
