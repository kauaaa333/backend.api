let usuarios = [
  { id: 1, nome: 'Ana', email: 'ana@email.com', senha: '123456' },
  { id: 2, nome: 'Bruno', email: 'bruno@email.com', senha: '123456' },
  { id: 3, nome: 'Alice', email: 'alice@email.com', senha: '123456' },
];

let proximoId = 4;

module.exports = {
  listar: () => usuarios,
  buscar: (id) => usuarios.find((u) => u.id === id),
  buscarPorId: (id) => usuarios.find((u) => u.id === id),
  buscarPorEmail: (email) => (email ? usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) : undefined),
  adicionar: ({ nome, email, senha }) => {
    const novo = { id: proximoId++, nome, email };
    if (senha) novo.senha = senha;
    usuarios.push(novo);
    return novo;
  },
  atualizar: (id, dados) => {
    const idx = usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    usuarios[idx] = { ...usuarios[idx], ...dados, id };
    return usuarios[idx];
  },
  remover: (id) => {
    const idx = usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    return usuarios.splice(idx, 1)[0];
  },
};
