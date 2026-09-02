const express = require('express');
const app = express();
const PORTA = 3000;

// middleware -- essencial para ler o body das requisicoes POST, PUT, DELETE
app.use(express.json());

// let para poder reatribuir a variavel no DELETE (e nao const)
let tarefas = [

  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer' },

  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento' },

  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido' },

];

let proximoId = 4;

// Array inicial de usuarios
let usuarios = [{ id: 1, nome: 'admin', email: 'admin@taskflow.com', senha: '1234' }];

let proximoIdUsuario = 2;

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
    return res.status(404).json({ erro: 'Tarefa nao encontrada' });
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
    return res.status(404).json({ erro: 'Tarefa nao encontrada' });
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
    return res.status(404).json({ erro: 'Tarefa nao encontrada' });
  }
  tarefas = tarefas.filter(t => t.id !== id);
  res.json({ mensagem: 'Tarefa removida com sucesso', id });
});

// --- ROTAS DE USUARIOS ---

// ROTA 1 -- Listar usuarios
// GET /usuarios -> 200 [ array de usuarios ]
app.get('/usuarios', (req, res) => {
  res.json(usuarios);
});

// ROTA 2 -- Buscar usuario por ID
// GET /usuarios/1 -> 200 { id: 1, nome: 'admin', ... }
// GET /usuarios/99 -> 404 { erro: 'Usuario nao encontrado' }
app.get('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuario = usuarios.find(u => u.id === id);
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }
  res.json(usuario);
});

// ROTA 3 -- Criar usuario
// POST /usuarios
// Body: { nome, email, senha }
// Resposta: 201 + usuario criado com id gerado
// DESAFIO: nao permitir dois usuarios com o mesmo email
// No POST: verificar se ja existe email -> 400 { erro: 'Email ja cadastrado' }
app.post('/usuarios', (req, res) => {
  const { nome, email, senha } = req.body;

  // Verificar se email ja cadastrado
  const emailExistente = usuarios.find(u => u.email === email);
  if (emailExistente) {
    return res.status(400).json({ erro: 'Email ja cadastrado' });
  }

  const novoUsuario = {
    id: proximoIdUsuario++,
    nome,
    email,
    senha,
  };

  usuarios.push(novoUsuario);
  res.status(201).json(novoUsuario);
});

// ROTA 4 -- Atualizar usuario
// PUT /usuarios/1
// Body: { nome, email, senha }
// Resposta: 200 + usuario atualizado
app.put('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }
  const { nome, email, senha } = req.body;
  const usuarioAtualizado = { id, nome, email, senha };
  usuarios[idx] = usuarioAtualizado;
  res.json(usuarioAtualizado);
});

// ROTA 5 -- Deletar usuario
// DELETE /usuarios/1
// Resposta: 200 + { mensagem: 'Usuario removido', id: 1 }
app.delete('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!usuarios.find(u => u.id === id)) {
    return res.status(404).json({ erro: 'Usuario nao encontrado' });
  }
  usuarios = usuarios.filter(u => u.id !== id);
  res.json({ mensagem: 'Usuario removido', id });
});

// Rota 404 -- sempre por ultimo (captura tudo que nao foi tratado acima)
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada', metodo: req.method, caminho: req.url });
});

// Iniciar o servidor
app.listen(PORTA, () => console.log(`Porta ${PORTA}`));