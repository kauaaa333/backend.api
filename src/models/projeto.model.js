// src/models/projeto.model.js

// Dados em memória -- substitui o banco por enquanto
let projetos = [
  { id: 1, nome: 'TaskFlow MVP', descricao: 'Desenvolvimento do MVP da TaskFlow API' },
  { id: 2, nome: 'Docs UC12', descricao: 'Documentação das aulas da UC12' },
];

let proximoIdProjeto = 3;

const projetoModel = {
  listar() {
    return projetos;
  },

  buscarPorId(id) {
    return projetos.find(p => p.id === id);
  },

  buscarPorNome(nome) {
    return projetos.find(p => p.nome === nome);
  },

  adicionar(dados) {
    const novoProjeto = {
      id: proximoIdProjeto++,
      nome: dados.nome,
      descricao: dados.descricao || '',
    };
    projetos.push(novoProjeto);
    return novoProjeto;
  },

  atualizar(id, dados) {
    const idx = projetos.findIndex(p => p.id === id);
    if (idx === -1) {
      return null;
    }
    projetos[idx] = { ...projetos[idx], ...dados, id };
    return projetos[idx];
  },

  remover(id) {
    const idx = projetos.findIndex(p => p.id === id);
    if (idx === -1) {
      return null;
    }
    const removido = projetos.splice(idx, 1)[0];
    return removido;
  },
};

module.exports = projetoModel;