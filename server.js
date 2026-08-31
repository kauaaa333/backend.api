const express = require('express');
const estatisticasRoutes = require('./src/routes/estatisticas.routes');
const tarefasRoutes = require('./src/routes/tarefas.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.use(express.json());
app.get('/', (req, res) => {
  res.json({ api: 'TaskFlow', status: 'online' });
});
app.use('/estatisticas', estatisticasRoutes);
app.use('/tarefas', tarefasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', metodo: req.method, caminho: req.url });
});

app.listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`));
