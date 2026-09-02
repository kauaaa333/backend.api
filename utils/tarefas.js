// utils/tarefas.js - módulo de tarefas
// module.exports define o que este arquivo exporta para quem fizer require() dele

const tarefas = [];

function listarTodas() {
  return tarefas;
}

function buscarPorId(id) {
  return tarefas.find((t) => t.id === id);
}

function adicionar(tarefa) {
  tarefas.push(tarefa);
  return tarefa;
}

function remover(id) {
  const index = tarefas.findIndex((t) => t.id === id);
  if (index !== -1) {
    return tarefas.splice(index, 1)[0];
  }
  return null;
}

// Exportar objeto com todas as funções
module.exports = { listarTodas, buscarPorId, adicionar, remover };
