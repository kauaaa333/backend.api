const { id, data, parametroId, lista, operacao: op } = require('./comum');
module.exports = {
  schemas: {
    ComentarioEntrada: { type: 'object', required: ['texto'], properties: { texto: { type: 'string', minLength: 1, example: 'Revisar esta etapa' } } },
    Comentario: { type: 'object', properties: { id, texto: { type: 'string' }, tarefaId: id, usuarioId: id, criadoEm: data, atualizadoEm: data } },
  },
  paths: {
    '/tarefas/{id}/comentarios': {
      get: op('Comentários', 'Lista comentários de tarefa acessível', lista('Comentario'), { parameters: [parametroId] }),
      post: op('Comentários', 'Comenta em tarefa acessível', 'Comentario', { parameters: [parametroId], body: 'ComentarioEntrada', status: 201 }),
    },
    '/comentarios/{id}': { delete: op('Comentários', 'Exclui comentário (autor ou administrador)', null, { parameters: [parametroId], status: 204 }) },
  },
};
