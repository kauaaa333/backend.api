const { Prisma } = require('@prisma/client');
const validar = require('../src/middlewares/validar');
const schemas = require('../src/middlewares/schemas');
const criarErro = require('../src/utils/criarErro');
const tratarErros = require('../src/middlewares/erro.middleware');
const { pegarErro, criarRes, silenciarConsole } = require('./helpers');

beforeEach(silenciarConsole);
describe('exercícios do Dia 4', () => {
  test('email incompleto é recusado sem chamar next', () => {
    const next = jest.fn();
    const erro = pegarErro(() => validar(schemas.usuario)({
      body: { nome: 'Ana', email: 'ana@', senha: 'senha-de-teste' },
    }, {}, next));
    expect(erro.status).toBe(400);
    expect(erro.detalhes).toEqual(["O campo 'email' deve ser um email válido"]);
    expect(next).not.toHaveBeenCalled();
  });
  test('nome e senha curtos geram dois detalhes na ordem do schema', () => {
    const next = jest.fn();
    const erro = pegarErro(() => validar(schemas.usuario)({
      body: { nome: 'Al', email: 'ana@example.com', senha: '123' },
    }, {}, next));
    expect(erro.detalhes).toEqual([
      "O campo 'nome' deve ter ao menos 3 caracteres", "O campo 'senha' deve ter ao menos 6 caracteres",
    ]);
    expect(next).not.toHaveBeenCalled();
  });
  test('descrição de projeto com 201 caracteres excede o limite', () => {
    const next = jest.fn();
    const erro = pegarErro(() => validar(schemas.projeto)({
      body: { nome: 'TaskFlow', descricao: 'a'.repeat(201) },
    }, {}, next));
    expect(erro.detalhes).toEqual(["O campo 'descricao' deve ter no máximo 200 caracteres"]);
    expect(next).not.toHaveBeenCalled();
  });
  test('resposta 400 chama status uma vez e preserva os detalhes', () => {
    const detalhes = ["O campo 'texto' é obrigatório"];
    const res = criarRes();
    tratarErros(criarErro(400, 'Dados inválidos', detalhes), { method: 'POST', path: '/tarefas' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ erro: { mensagem: 'Dados inválidos', detalhes } });
  });
  test('P2025 em PUT responde 404 com mensagem pública', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('interno', { code: 'P2025', clientVersion: Prisma.prismaVersion.client });
    const res = criarRes();
    tratarErros(erro, { method: 'PUT', path: '/tarefas/99' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: { mensagem: 'Registro não encontrado' } });
  });
});
