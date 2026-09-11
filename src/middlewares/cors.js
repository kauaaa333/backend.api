// (Slide S11 Dia 2) Middleware manual de CORS.
// Mantido por referência, mas a implementação do projeto usa o pacote `cors`.
// Se quiser trocar para o manual: importe e use `app.use(corsManual)`.
module.exports = function corsManual(req, res, next) {
  const origem = process.env.CORS_ORIGIN || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origem);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
};
