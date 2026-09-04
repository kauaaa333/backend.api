let tarefas = [
  { id: 1, texto: 'Estudar Node.js', prioridade: 'alta', coluna: 'andamento', usuarioId: 1, projetoId: 1, concluidaEm: null },
  { id: 2, texto: 'Fazer exercícios', prioridade: 'alta', coluna: 'afazer', usuarioId: 1, projetoId: 1, concluidaEm: null },
  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido', usuarioId: 2, projetoId: 2, concluidaEm: '2026-09-04T12:00:00.000Z' },
];

let proximoId = 4;

module.exports = {
  listar: () => tarefas,
  listarPorColuna: (coluna) => tarefas.filter((t) => t.coluna === coluna),
  listarPorUsuario: (usuarioId) => tarefas.filter((t) => t.usuarioId === usuarioId),
  listarPorProjeto: (projetoId) => tarefas.filter((t) => t.projetoId === projetoId),
  buscar: (id) => tarefas.find((t) => t.id === id),
  buscarPorId: (id) => tarefas.find((t) => t.id === id),
  adicionar: ({ texto, prioridade = 'media', coluna = 'afazer', usuarioId = null, projetoId = null, concluidaEm = null }) => {
    const nova = {
      id: proximoId++,
      texto,
      prioridade: prioridade || 'media',
      coluna: coluna || 'afazer',
      usuarioId: usuarioId !== undefined ? usuarioId : null,
      projetoId: projetoId !== undefined ? projetoId : null,
      concluidaEm: coluna === 'concluido' ? (concluidaEm || new Date().toISOString()) : null,
    };
    tarefas.push(nova);
    return nova;
  },
  atualizar: (id, dados) => {
    const idx = tarefas.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tarefas[idx] = { ...tarefas[idx], ...dados, id };
    return tarefas[idx];
  },
  remover: (id) => {
    const idx = tarefas.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    return tarefas.splice(idx, 1)[0];
  },
};
