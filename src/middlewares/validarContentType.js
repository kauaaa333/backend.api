const metodosComBody = ['POST', 'PUT', 'PATCH'];
const criarErro = require('../utils/criarErro');

function validarContentType(req, res, next) {
  if (metodosComBody.includes(req.method)) {
    const contentType = req.headers['content-type'];

    // Sem corpo, o schema informa quais campos faltam (400).
    if (!req.headers['transfer-encoding'] && Number(req.headers['content-length'] || 0) === 0) {
      return next();
    }

    if (!contentType || !contentType.includes('application/json')) {
      throw criarErro(415, 'Content-Type inválido. Use: application/json');
    }
  }

  next();
}

module.exports = validarContentType;
