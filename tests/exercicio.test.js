const criarErro = require('../src/utils/criarErro');
const traduzirErroPrisma = require('../src/utils/traduzirErroPrisma');

describe('Exercícios do Dia 3', () => {
  test('erro interno tem status 500 e detalhes undefined', () => {
    const erro = criarErro(500, 'Erro interno no servidor');

    expect(erro.status).toBe(500);
    expect(erro.message).toBe('Erro interno no servidor');
    expect(erro.detalhes).toBeUndefined();
  });

  test('P2003 ao atualizar vira 400 e explica o id inválido', () => {
    const erroPrisma = { code: 'P2003' };

    const erro = traduzirErroPrisma(erroPrisma, 'PUT');

    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Um dos ids informados não existe');
  });

  test('P2025 informa que o registro não foi encontrado', () => {
    const erroPrisma = { code: 'P2025' };

    const erro = traduzirErroPrisma(erroPrisma, 'GET');

    expect(erro.message).toBe('Registro não encontrado');
  });

  test('P2003 ao excluir explica os registros ligados', () => {
    const erroPrisma = { code: 'P2003' };

    const erro = traduzirErroPrisma(erroPrisma, 'DELETE');

    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Não é possível excluir: existem registros ligados a este');
  });
});
