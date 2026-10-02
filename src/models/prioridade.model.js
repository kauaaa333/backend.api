// Espelha a tabela prioridades do banco: o id cresce com a importância
let prioridades = [
  { id: 1, descricao: 'baixissima', ativo: true },
  { id: 2, descricao: 'baixa', ativo: true },
  { id: 3, descricao: 'media', ativo: true },
  { id: 4, descricao: 'alta', ativo: true },
  { id: 5, descricao: 'urgente', ativo: true },
];

// Prioridade usada quando a tarefa não informa idprioridade ('media')
const ID_PADRAO = 3;

module.exports = {
  ID_PADRAO,
  listar: () => prioridades,
  buscar: (id) => prioridades.find((p) => p.id === id),
};
