// Importando o módulo express
const express = require('express');
const app = express();
const PORTA = Number(process.env.PORT) || 3000;

// middleware -- essencial para ler o body das requisições POST, PUT, DELETE
app.use(express.json());

// let para poder reatribuir a variável no DELETE (e não const)
let tarefas = [

  { id: 1, texto: 'Estudar Node', prioridade: 'alta', coluna: 'afazer' },

  { id: 2, texto: 'Criar API', prioridade: 'alta', coluna: 'andamento' },

  { id: 3, texto: 'Testar Postman', prioridade: 'media', coluna: 'concluido' },

];

let proximoId = 4;

// Array inicial de usuários
let usuarios = [{ id: 1, nome: 'admin', email: 'admin@taskflow.com', senha: '1234' }];

let proximoIdUsuario = 2;

const COLUNAS_VALIDAS = ['afazer', 'andamento', 'concluido'];
const PRIORIDADES_VALIDAS = ['alta', 'media', 'baixa'];

function contarPor(campo, itens) {
  return itens.reduce((contagem, item) => {
    contagem[item[campo]] = (contagem[item[campo]] || 0) + 1;
    return contagem;
  }, {});
}

function valorMaisComum(contagem) {
  const entradas = Object.entries(contagem);
  return entradas.length === 0
    ? null
    : entradas.sort(([, quantidadeA], [, quantidadeB]) => quantidadeB - quantidadeA)[0][0];
}

function calcularEstatisticas(itens) {
  const porColuna = Object.fromEntries(COLUNAS_VALIDAS.map((coluna) => [coluna, 0]));
  const porPrioridade = Object.fromEntries(PRIORIDADES_VALIDAS.map((prioridade) => [prioridade, 0]));

  Object.assign(porColuna, contarPor('coluna', itens));
  Object.assign(porPrioridade, contarPor('prioridade', itens));

  return {
    total: itens.length,
    porColuna,
    porPrioridade,
    colunaComMaisTarefas: valorMaisComum(porColuna),
    prioridadeMaisComum: valorMaisComum(porPrioridade),
  };
}

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

// ROTA GET -- Estatísticas das tarefas
// GET /estatisticas?coluna=afazer -- panorama geral ou filtrado por coluna
app.get('/estatisticas', (req, res) => {
  const { coluna } = req.query;

  if (coluna && !COLUNAS_VALIDAS.includes(coluna)) {
    return res.status(400).json({
      erro: 'Coluna inválida',
      colunasAceitas: COLUNAS_VALIDAS,
    });
  }

  const tarefasFiltradas = coluna
    ? tarefas.filter((tarefa) => tarefa.coluna === coluna)
    : tarefas;

  res.json({
    filtro: coluna ? { coluna } : null,
    ...calcularEstatisticas(tarefasFiltradas),
  });
});

// ROTA GET -- Resumo textual e dinâmico das tarefas
// Esta rota deve ficar antes de qualquer rota dinâmica de estatísticas.
app.get('/estatisticas/resumo', (req, res) => {
  const estatisticas = calcularEstatisticas(tarefas);
  const { total, porColuna, prioridadeMaisComum } = estatisticas;

  res.json({
    resumo: `Você tem ${total} tarefa(s). ${porColuna.concluido} concluída(s), ${porColuna.andamento} em andamento e ${porColuna.afazer} a fazer. Prioridade mais comum: ${prioridadeMaisComum || 'nenhuma'}.`,
  });
});

// ROTAS DE USUÁRIOS -- CRUD completo com e-mail único
app.get('/usuarios', (req, res) => {
  res.json(usuarios);
});

app.get('/usuarios/:id', (req, res) => {
  const usuario = usuarios.find((item) => item.id === Number(req.params.id));
  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }
  res.json(usuario);
});

app.post('/usuarios', (req, res) => {
  const { nome, email, senha } = req.body;
  const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!nome || !emailNormalizado || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (usuarios.some((item) => item.email.toLowerCase() === emailNormalizado)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const novoUsuario = { id: proximoIdUsuario++, nome, email: emailNormalizado, senha };
  usuarios.push(novoUsuario);
  res.status(201).json(novoUsuario);
});

app.put('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = usuarios.findIndex((item) => item.id === id);
  if (indice === -1) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const { nome, email, senha } = req.body;
  const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!nome || !emailNormalizado || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (usuarios.some((item) => item.id !== id && item.email.toLowerCase() === emailNormalizado)) {
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  }

  const usuarioAtualizado = { id, nome, email: emailNormalizado, senha };
  usuarios[indice] = usuarioAtualizado;
  res.json(usuarioAtualizado);
});

app.delete('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const indice = usuarios.findIndex((item) => item.id === id);
  if (indice === -1) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  usuarios.splice(indice, 1);
  res.json({ mensagem: 'Usuário removido com sucesso', id });
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
app.listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`));
