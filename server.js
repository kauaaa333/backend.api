const express = require('express');
const app = express();
const PORTA = 3000;

// middleware -- essencial para ler o body das requisicoes POST, PUT, DELETE
app.use(express.json());

// Rotas de tarefas
app.use('/tarefas', require('./src/routes/tarefas.routes'));

// Rotas de usuarios
app.use('/usuarios', require('./src/routes/usuarios.routes'));

// Rotas de estatisticas
app.use('/estatisticas', require('./src/routes/estatisticas.routes'));

// Rota 404 -- sempre por ultimo (captura tudo que nao foi tratado acima)
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada', metodo: req.method, caminho: req.url });
});

// Iniciar o servidor
app.listen(PORTA, () => console.log(`Porta ${PORTA}`));