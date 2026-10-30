const { id, data, lista, operacao: op } = require('./comum');
module.exports = {
  schemas: { Prioridade: { type: 'object', properties: { id, descricao: { type: 'string' }, ativo: { type: 'boolean' }, criadoEm: data } } },
  paths: { '/prioridades': { get: op('Prioridades', 'Lista prioridades ativas', lista('Prioridade')) } },
};
