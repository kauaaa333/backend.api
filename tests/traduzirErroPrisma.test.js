const traduzirErroPrisma = require('../src/utils/traduzirErroPrisma');

describe('traduzirErroPrisma', () => {
  test('P2002 vira 409 e informa o campo repetido', () => {
    const erroPrisma = { code: 'P2002', meta: { target: ['email'] } };

    const erro = traduzirErroPrisma(erroPrisma, 'POST');

    expect(erro.status).toBe(409);
    expect(erro.message).toBe('Já existe um registro com esse valor');
    expect(erro.detalhes[0]).toBe('Valor repetido em: email');
  });

  test('P2003 ao criar vira 400', () => {
    const erroPrisma = { code: 'P2003' };

    const erro = traduzirErroPrisma(erroPrisma, 'POST');

    expect(erro.status).toBe(400);
  });

  test('P2003 ao excluir vira 409', () => {
    const erroPrisma = { code: 'P2003' };

    const erro = traduzirErroPrisma(erroPrisma, 'DELETE');

    expect(erro.status).toBe(409);
  });

  test('P2025 vira 404', () => {
    const erroPrisma = { code: 'P2025' };

    const erro = traduzirErroPrisma(erroPrisma, 'PUT');

    expect(erro.status).toBe(404);
  });

  test('código não tratado continua sem status', () => {
    const erroPrisma = { code: 'P1001', message: 'banco fora do ar' };

    const erro = traduzirErroPrisma(erroPrisma, 'GET');

    expect(erro.status).toBeUndefined();
    expect(erro).toBe(erroPrisma);
  });
});
