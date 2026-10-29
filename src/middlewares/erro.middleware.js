const { Prisma } = require('@prisma/client');
const traduzirErroPrisma = require('../utils/traduzirErroPrisma');

function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);
  if (erro instanceof Prisma.PrismaClientKnownRequestError ||
      erro instanceof Prisma.PrismaClientUnknownRequestError)
    erro = traduzirErroPrisma(erro, req.method);

  let status = Number.isInteger(erro.status) && erro.status >= 400 && erro.status <= 599
    ? erro.status : 500;
  let mensagem = erro.message;
  let detalhes = erro.detalhes;

  // Violações conhecidas do PostgreSQL são erros operacionais.
  if (erro.code === '23505') {
    status = 409;
    mensagem = 'Registro já cadastrado';
  } else if (erro.code === '23503') {
    status = req.method === 'DELETE' ? 409 : 400;
    mensagem = 'Registro relacionado inexistente ou ainda associado a outros dados';
  } else if (['23502', '23514', '22001', '22P02', '22003'].includes(erro.code)) {
    status = 400;
    mensagem = 'Dados inválidos para este registro';
  }

  if (erro.type === 'entity.parse.failed') mensagem = 'JSON inválido';
  if (status >= 500) {
    mensagem = 'Erro interno no servidor';
    detalhes = undefined;
  }

  console.error('[ERRO]', req.method, req.path, erro.stack || erro.message);
  res.status(status).json({ erro: { mensagem, ...(detalhes !== undefined ? { detalhes } : {}) } });
}

module.exports = tratarErros;
