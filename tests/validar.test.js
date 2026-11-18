const validar = require('../src/middlewares/validar');
const schemas = require('../src/middlewares/schemas');
const { pegarErro } = require('./helpers');

describe('validar', () => {
  test('dados válidos chamam next uma vez e normalizam os ids do body', () => {
    const req = { method: 'POST', body: { texto: 'Estudar', coluna: 'afazer', usuarioId: '1' } };
    const next = jest.fn();
    validar(schemas.tarefa)(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.usuarioId).toBe(1);
  });
  test('sem body informa os campos obrigatórios do contrato atual', () => {
    const next = jest.fn();
    const erro = pegarErro(() => validar(schemas.tarefa)({}, {}, next));
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Dados inválidos');
    expect(erro.detalhes).toEqual(["O campo 'texto' é obrigatório"]);
    expect(next).not.toHaveBeenCalled();
  });
  test('coluna inválida informa os valores permitidos', () => {
    const next = jest.fn();
    const erro = pegarErro(() => validar(schemas.tarefa)({ body: { texto: 'Estudar', coluna: 'feito' } }, {}, next));
    expect(erro.detalhes).toEqual(["O campo 'coluna' deve ser um de: afazer, andamento, concluido"]);
    expect(next).not.toHaveBeenCalled();
  });
  test('id da URL aceita inteiro positivo e recusa texto', () => {
    const middleware = validar(schemas.id, 'params');
    const nextBom = jest.fn(), nextRuim = jest.fn();
    middleware({ params: { id: '7' } }, {}, nextBom);
    const erro = pegarErro(() => middleware({ params: { id: 'abc' } }, {}, nextRuim));
    expect(nextBom).toHaveBeenCalledTimes(1);
    expect(erro.detalhes).toEqual(["O campo 'id' deve ser um inteiro positivo até 2147483647"]);
    expect(nextRuim).not.toHaveBeenCalled();
  });
  test('projeto sem descrição opcional segue para o controller', () => {
    const next = jest.fn();
    validar(schemas.projeto)({ body: { nome: 'TaskFlow' } }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
