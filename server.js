require('dotenv').config();

const express = require('express');
const cors = require('cors');

const tarefasRoutes = require('./src/routes/tarefas.routes');
const authRoutes = require('./src/routes/auth.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const projetosRoutes = require('./src/routes/projetos.routes');
const estatisticasRoutes = require('./src/routes/estatisticas.routes');

const logger = require('./src/middlewares/logger');
const validarContentType = require('./src/middlewares/validarContentType');
const temporizador = require('./src/middlewares/temporizador');
const autenticar = require('./src/middlewares/autenticar');

const app = express();
const PORTA = process.env.PORT || process.env.PORTA || 3000;
const origensPermitidas = [
  'http://localhost:5173',
  'https://task-flow-gamma-inky.vercel.app',
  ...(process.env.CORS_ORIGIN || '').split(',').map((origem) => origem.trim()).filter(Boolean),
];

// CORS deve ser o PRIMEIRO middleware
app.use(
  cors({
    origin: origensPermitidas,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Middleware de parser do body (precisa vir antes dos middlewares que dependem do req.body)
app.use(express.json());

// Middlewares globais (executam antes das rotas)
app.use(temporizador);
app.use(validarContentType);
app.use(logger);

app.use('/auth', authRoutes);
app.use('/tarefas', autenticar, tarefasRoutes);
app.use('/usuarios', autenticar, usuariosRoutes);
app.use('/projetos', autenticar, projetosRoutes);
app.use('/estatisticas', autenticar, estatisticasRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});

module.exports = app;
