// server.js - TaskFlow API com rotas Express completas
// Dia 3 - Express: Servidor e Rotas GET

const express = require('express');
const app = express();
const PORTA = 3000;

// Dados em memória -- substitui o banco por enquanto
const tarefas = [

  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer' },

  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento' },

  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido' },

];

// ROTA 1 -- Status da API
// GET / -- status da API
app.get('/', (req, res) => {
  res.json({ api: 'TaskFlow', versao: '1.0', status: 'online' });
});

// ROTA 2 -- Listar todas as tarefas
// GET /tarefas -- listar todas as tarefas
app.get('/tarefas', (req, res) => {
  res.json(tarefas);
});

// ROTA 3 -- Buscar tarefa por ID
// GET /tarefas/:id -- captura parâmetro dinâmico
app.get('/tarefas/:id', (req, res) => {
  // req.params.id chega como STRING -- converter para número
  const id = Number(req.params.id);
  // Buscar a tarefa no array
  const tarefa = tarefas.find(t => t.id === id);
  // Se não encontrou -- retornar 404
  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  // Se encontrou -- retornar a tarefa
  res.json(tarefa);
});

// ROTA 4 -- Filtrar por coluna
// GET /tarefas?coluna=afazer -- só as da coluna afazer
// GET /tarefas?prioridade=alta -- só as de alta prioridade
app.get('/tarefas', (req, res) => {

  // req.query contém os filtros da URL
  const { coluna, prioridade } = req.query;

  // Começar com todas as tarefas
  let resultado = tarefas;

  // Filtrar por coluna se informado
  if (coluna) {
    resultado = resultado.filter(t => t.coluna === coluna);
  }

  // Filtrar por prioridade se informado
  if (prioridade) {
    resultado = resultado.filter(t => t.prioridade === prioridade);
  }

  res.json(resultado);
});

// ROTA 5 -- Listar usuários (estrutura simples)
// GET /usuarios -- lista de usuários
app.get('/usuarios', (req, res) => {
  res.json([{ id: 1, nome: 'admin', email: 'admin@taskflow.com' }]);
});

// ROTA 6 -- 404 genérico
// app.use() no final captura tudo que não foi tratado
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', metodo: req.method, caminho: req.url });
});

// Iniciar o servidor
app.listen(PORTA, () => console.log(`Porta ${PORTA}`));