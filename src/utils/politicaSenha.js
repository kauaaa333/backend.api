const SENHAS_PUBLICAS = new Set(['123456', '123456789', 'password', 'senha123']);

function producao() {
  return process.env.NODE_ENV === 'production' || process.env.TASKFLOW_PRODUCTION_SECURITY === 'true';
}

function senhaAceita(senha) {
  if (typeof senha !== 'string' || Buffer.byteLength(senha, 'utf8') > 72) return false;
  if (!producao()) return senha.length >= 6;
  return senha.length >= 12 && !SENHAS_PUBLICAS.has(senha.toLowerCase());
}

module.exports = { producao, senhaAceita };
