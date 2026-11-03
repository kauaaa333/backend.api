const { id, lista, operacao: op } = require('./comum');
module.exports = {
  schemas: { Prioridade: { type: 'object', properties: { id, descricao: { type: 'string' }, ativo: { type: 'boolean' }, cor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#EAB308' } } } },
  paths: { '/prioridades': { get: op('Prioridades', 'Lista prioridades ativas', lista('Prioridade')) } },
};
