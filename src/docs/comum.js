const ref = nome => ({ $ref: `#/components/schemas/${nome}` });
const json = nome => ({ 'application/json': { schema: typeof nome === 'string' ? ref(nome) : nome } });
const id = { type: 'integer', minimum: 1, maximum: 2147483647, example: 1 };
const data = { type: 'string', format: 'date-time' };
const parametroId = { name: 'id', in: 'path', required: true, schema: id };
const resposta = (description, schema) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const lista = nome => ({ type: 'array', items: ref(nome) });
const erros = {
  400: resposta('Dados, parâmetros ou referências inválidos', 'Erro'),
  401: resposta('Token ausente, inválido, expirado ou sessão revogada', 'Erro'),
  403: resposta('Operação não permitida para esta conta', 'Erro'),
  404: resposta('Registro inexistente ou não acessível pela conta', 'Erro'),
  409: resposta('Nome/e-mail duplicado, vínculo que impede exclusão ou limite de tarefas em andamento', 'Erro'),
  415: resposta('Use Content-Type: application/json nas escritas com corpo', 'Erro'),
  500: resposta('Erro interno; detalhes técnicos não são expostos', 'Erro'),
};
function operacao(tag, summary, schema, options = {}) {
  const { status = 200, body, parameters, ...resto } = options;
  return { tags: [tag], summary, ...(parameters ? { parameters } : {}),
    ...(body ? { requestBody: { required: true, content: json(body) } } : {}),
    responses: { ...erros, [status]: resposta(status === 204 ? 'Removido, sem corpo de resposta' : 'Operação concluída', schema) }, ...resto };
}
const filtros = [
  ...['usuarioId', 'projetoId'].map(name => ({ name, in: 'query', schema: id })),
  { name: 'coluna', in: 'query', schema: { type: 'string', enum: ['afazer', 'andamento', 'concluido'] } },
];
module.exports = { ref, json, id, data, parametroId, resposta, lista, operacao, filtros,
  schemas: { Erro: { type: 'object', required: ['erro'], properties: {
    erro: { type: 'object', required: ['mensagem'], properties: {
      mensagem: { type: 'string', example: 'Dados inválidos' },
      detalhes: { type: 'array', items: { type: 'string' } },
    } },
  } } } };
