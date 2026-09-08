function temporizador(req, res, next) {
  const inicio = Date.now();

  res.on('finish', () => {
    const duracaoMs = Date.now() - inicio;
    const metodo = req.method;
    const url = req.originalUrl || req.url;
    console.log(`[${metodo}] ${url} — ${duracaoMs}ms`);
  });

  next();
}

module.exports = temporizador;
