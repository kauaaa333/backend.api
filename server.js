const express = require('express');
const tarefasRoutes = require('./src/routes/tarefas.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const projetosRoutes = require('./src/routes/projetos.routes');
const estatisticasRoutes = require('./src/routes/estatisticas.routes');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());

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
