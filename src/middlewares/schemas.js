const schemas = {
  id: {
    id: { obrigatorio: true, tipo: 'inteiro' },
  },
  filtroTarefas: {
    usuarioId: { obrigatorio: false, tipo: 'inteiro' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    coluna: { obrigatorio: false, tipo: 'string', enum: ['afazer', 'andamento', 'concluido'] },
  },
  tarefa: {
    texto: { obrigatorio: true, tipo: 'string' },
    idprioridade: { obrigatorio: false, tipo: 'inteiro' },
    prioridade: { obrigatorio: false, tipo: 'string' },
    coluna: { obrigatorio: false, tipo: 'string', enum: ['afazer', 'andamento', 'concluido'] },
    usuarioId: { obrigatorio: false, tipo: 'inteiro' },
    projetoId: { obrigatorio: false, tipo: 'inteiro' },
    ordem: { obrigatorio: false, tipo: 'number', inteiro: true, minimo: 0 },
  },
  usuario: {
    nome: { obrigatorio: true, tipo: 'string', minLength: 3, maxLength: 100 },
    email: { obrigatorio: true, tipo: 'string', formato: 'email', maxLength: 150 },
    senha: { obrigatorio: true, tipo: 'string', minLength: 6 },
  },
  projeto: {
    nome: { obrigatorio: true, tipo: 'string', maxLength: 100 },
    descricao: { obrigatorio: false, tipo: 'string', maxLength: 200 },
  },
};

module.exports = schemas;
