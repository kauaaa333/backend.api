// server.js - TaskFlow API CRUD completo (Dias 3 e 4)
// Express com rotas GET, POST, PUT e DELETE

const express = require('express');
const app = express();
const PORTA = 3000;

// middleware -- essencial para ler o body das requisições POST, PUT, DELETE
app.use(express.json());

// let para poder reatribuir a variável no DELETE (e não const)
let tarefas = [

  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer' },

  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento' },

  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido' },

];

let proximoId = 4;

// ROTA GET -- Listar todas as tarefas
// GET /tarefas -- retorna array com todas as tarefas
app.get('/tarefas', (req, res) => {
  res.json(tarefas);
});

// ROTA GET -- Buscar tarefa por ID
// GET /tarefas/:id -- retorna uma tarefa pelo ID
app.get('/tarefas/:id', (req, res) => {
  const tarefa = tarefas.find(t => t.id === Number(req.params.id));
  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  res.json(tarefa);
});

// ROTA POST -- Criar nova tarefa
// POST /tarefas -- cria nova tarefa com ID gerado pelo servidor
// Body JSON esperado: { texto, prioridade, coluna, cidade }
app.post('/tarefas', (req, res) => {
  const { texto, prioridade, coluna, cidade } = req.body;

  const novaTarefa = {
    id: proximoId++,
    texto: texto,
    prioridade: prioridade || 'media',
    coluna: coluna || 'afazer',
    cidade: cidade || '',
  };

  tarefas.push(novaTarefa);
  res.status(201).json(novaTarefa);
});

// ROTA PUT -- Substituir tarefa completa
// PUT /tarefas/:id -- substitui todos os campos da tarefa
// Body JSON esperado: { texto, prioridade, coluna, cidade }
app.put('/tarefas/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = tarefas.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  const { texto, prioridade, coluna, cidade } = req.body;
  const tarefaAtualizada = { id, texto, prioridade, coluna, cidade };
  tarefas[idx] = tarefaAtualizada;
  res.json(tarefaAtualizada);
});

// ROTA DELETE -- Remover tarefa
// DELETE /tarefas/:id -- remove a tarefa definitivamente
app.delete('/tarefas/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!tarefas.find(t => t.id === id)) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  tarefas = tarefas.filter(t => t.id !== id);
  res.json({ mensagem: 'Tarefa removida com sucesso', id });
});

// ROTA GET -- Status da API
// GET /
app.get('/', (req, res) => {
  res.json({ api: 'TaskFlow', status: 'online' });
});

// ROTA 404 -- sempre por último (captura tudo que não foi tratado acima)
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', metodo: req.method, caminho: req.url });
});

// Iniciar o servidor
app.listen(PORTA, () => console.log(`Porta ${PORTA}`));