function pegarErro(acao) {
  try { acao(); } catch (erro) { return erro; }
  throw new Error('Era esperado que a validação lançasse um erro');
}

function criarRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

function silenciarConsole() {
  jest.spyOn(console, 'error').mockImplementation(() => {});
}

module.exports = { pegarErro, criarRes, silenciarConsole };
