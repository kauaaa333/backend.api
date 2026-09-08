const express = require('express');
const tarefasRoutes = require('./src/routes/tarefas.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const projetosRoutes = require('./src/routes/projetos.routes');
const estatisticasRoutes = require('./src/routes/estatisticas.routes');

const logger = require('./src/middlewares/logger');
const validarContentType = require('./src/middlewares/validarContentType');
const temporizador = require('./src/middlewares/temporizador');

const app = express();
const PORTA = process.env.PORT || 3000;

// Middleware de parser do body (precisa vir antes dos middlewares que dependem do req.body)
app.use(express.json());

// Middlewares globais (executam antes das rotas)
app.use(temporizador);
app.use(validarContentType);
app.use(logger);

app.use('/tarefas', tarefasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/projetos', projetosRoutes);
app.use('/estatisticas', estatisticasRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});

module.exports = app;
