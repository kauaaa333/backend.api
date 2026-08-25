// server.js - servidor básico
// Importar o Express (módulo de terceiro - npm install express)
const express = require('express');
// Criar o aplicativo
const app = express();
// Middleware para interpretar body JSON
app.use(express.json());
// Rota GET inicial
app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando!' });
});
// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});