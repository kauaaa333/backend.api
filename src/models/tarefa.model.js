const tarefas = [
  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer' },
  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento' },
  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido' },
];
let proximoId = 4;
function listar() { return tarefas; }
function buscarPorId(id) { return tarefas.find((tarefa) => tarefa.id === id); }
function adicionar({ texto, prioridade = 'media', coluna = 'afazer', cidade = '' }) { const novaTarefa = { id: proximoId++, texto, prioridade, coluna, cidade }; tarefas.push(novaTarefa); return novaTarefa; }
function atualizar(id, { texto, prioridade, coluna, cidade }) { const indice = tarefas.findIndex((tarefa) => tarefa.id === id); if (indice === -1) return null; const tarefa = { id, texto, prioridade, coluna, cidade }; tarefas[indice] = tarefa; return tarefa; }
function remover(id) { const indice = tarefas.findIndex((tarefa) => tarefa.id === id); return indice === -1 ? null : tarefas.splice(indice, 1)[0]; }
function listarPorColuna(coluna) { return tarefas.filter((tarefa) => tarefa.coluna === coluna); }
module.exports = { listar, buscarPorId, adicionar, atualizar, remover, listarPorColuna };
