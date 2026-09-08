function logger(req, res, next) {
  const agora = new Date().toISOString();
  const metodo = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection?.remoteAddress;

  console.log(`[${agora}] ${metodo} ${url} - IP: ${ip}`);
  next();
}

module.exports = logger;
