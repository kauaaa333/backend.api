const app = require('./app');
const PORTA = process.env.PORT || process.env.PORTA || 3000;

if (require.main === module) {
  app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
  });
}

// Mantém compatibilidade com os testes e com o ponto de entrada da Vercel.
module.exports = app;
