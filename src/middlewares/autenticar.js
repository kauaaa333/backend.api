const criarErro = require('../utils/criarErro');
const jwt = require('jsonwebtoken');
const usuarios = require('../models/usuario.model');
const { producao } = require('../utils/politicaSenha');
async function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (!req.headers.authorization)
    throw criarErro(401, 'Token de autenticação não informado');
  if (tipo !== 'Bearer' || !token)
    throw criarErro(401, 'Token de autenticação inválido');
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw criarErro(401, 'Token de autenticação inválido ou expirado');
  }
  if (claims.versaoUsuarios !== 'neon-v1' || !Number.isInteger(claims.id))
    throw criarErro(401, 'Faça login novamente após a integração com o banco');
  try {
    // O perfil vem do banco em cada requisição, não de claims ou do body.
    const usuario = await (usuarios.buscarParaSessao || usuarios.buscar)(claims.id);
    if (!usuario)
      throw criarErro(401, 'Usuário não encontrado. Faça login novamente');
    if ((producao() || claims.versaoSenha !== undefined) &&
        (!claims.versaoSenha || claims.versaoSenha !== usuario.versaoSenha))
      throw criarErro(401, 'Sessão expirada. Faça login novamente');
    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      administrador: usuario.administrador === true,
    };
    next();
  } catch (error) {
    next(error);
  }
}
module.exports = autenticar;
