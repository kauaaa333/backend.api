let projetos = [
  { id: 1, nome: 'TaskFlow MVP', descricao: 'Desenvolvimento do MVP da TaskFlow API' },
  { id: 2, nome: 'Docs UC12', descricao: 'Documentação das aulas da UC12' },
];

let proximoId = 3;

module.exports = {
  listar: () => projetos,
  buscar: (id) => projetos.find((p) => p.id === id),
  buscarPorId: (id) => projetos.find((p) => p.id === id),
  buscarPorNome: (nome) => (nome ? projetos.find((p) => p.nome.toLowerCase() === nome.toLowerCase().trim()) : undefined),
  adicionar: ({ nome, descricao }) => {
    const novo = {
      id: proximoId++,
      nome,
      descricao: descricao || null,
    };
    projetos.push(novo);
    return novo;
  },
  atualizar: (id, dados) => {
    const idx = projetos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    projetos[idx] = { ...projetos[idx], ...dados, id };
    return projetos[idx];
  },
  remover: (id) => {
    const idx = projetos.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    return projetos.splice(idx, 1)[0];
  },
};
