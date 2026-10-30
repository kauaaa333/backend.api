const { id, data, parametroId, lista, operacao: op } = require('./comum');
const entrada = { type: 'object', properties: {
  nome: { type: 'string', minLength: 1, maxLength: 100, example: 'Meu projeto' },
  descricao: { type: 'string', maxLength: 200, nullable: true },
} };
module.exports = {
  schemas: {
    ProjetoEntrada: { ...entrada, required: ['nome'] }, ProjetoAtualizacao: { ...entrada, minProperties: 1 },
    Projeto: { type: 'object', properties: { id, ...entrada.properties, usuarioId: id, criadoEm: data, atualizadoEm: data } },
    ProjetoResumo: { type: 'object', properties: { projeto: { $ref: '#/components/schemas/Projeto' }, totalTarefas: { type: 'integer' }, porColuna: { type: 'object', additionalProperties: { type: 'integer' } } } },
  },
  paths: {
    '/projetos': {
      get: op('Projetos', 'Lista projetos acessíveis', lista('Projeto')),
      post: op('Projetos', 'Cria um projeto para a conta autenticada', 'Projeto', { body: 'ProjetoEntrada', status: 201, description: 'Nome único, ignorando maiúsculas e espaços nas extremidades. Proprietário definido pelo servidor.' }),
    },
    '/projetos/{id}': {
      get: op('Projetos', 'Busca um projeto acessível', 'Projeto', { parameters: [parametroId] }),
      put: op('Projetos', 'Atualiza parcialmente um projeto', 'Projeto', { parameters: [parametroId], body: 'ProjetoAtualizacao' }),
      delete: op('Projetos', 'Exclui projeto sem tarefas associadas', null, { status: 204, parameters: [parametroId] }),
    },
    '/projetos/{id}/resumo': { get: op('Projetos', 'Resumo de um projeto', 'ProjetoResumo', { parameters: [parametroId] }) },
    '/projetos/{id}/tarefas': { get: op('Projetos', 'Lista tarefas acessíveis do projeto', lista('Tarefa'), { parameters: [parametroId, ...require('./comum').filtros] }) },
  },
};
