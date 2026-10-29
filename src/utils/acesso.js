const criarErro = require('./criarErro');

function podeAcessar(usuario, registro, campo = 'usuarioId') {
  return !!registro && (usuario.administrador === true || registro[campo] === usuario.id);
}
function falhaAcesso(res, entidade) {
  throw criarErro(404, entidade + ' não encontrado');
}
module.exports = { podeAcessar, falhaAcesso };
