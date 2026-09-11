const schemas = {
  tarefa: {
    texto: { obrigatorio: true, tipo: 'string' },
    prioridade: { obrigatorio: false, tipo: 'string', enum: ['alta', 'media', 'baixa'] },
    coluna: { obrigatorio: false, tipo: 'string', enum: ['afazer', 'andamento', 'concluido'] },
    usuarioId: { obrigatorio: false, tipo: 'number' },
  },
  usuario: {
    nome: { obrigatorio: true, tipo: 'string', minLength: 3 },
    email: { obrigatorio: true, tipo: 'string', formato: 'email' },
    senha: { obrigatorio: true, tipo: 'string', minLength: 6 },
  },
  projeto: {
    nome: { obrigatorio: true, tipo: 'string' },
    descricao: { obrigatorio: false, tipo: 'string', maxLength: 200 },
  },
};

module.exports = schemas;
