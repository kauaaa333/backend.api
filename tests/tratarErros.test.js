const { Prisma } = require('@prisma/client');
const tratarErros = require('../src/middlewares/erro.middleware');
const criarErro = require('../src/utils/criarErro');
const { criarRes, silenciarConsole } = require('./helpers');

beforeEach(silenciarConsole);
describe('tratarErros', () => {
  test('responde com o status e a mensagem do erro', () => {
    const res = criarRes(), next = jest.fn();
    tratarErros(criarErro(404, 'Tarefa não encontrada'), { method: 'GET', path: '/tarefas/99' }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: { mensagem: 'Tarefa não encontrada' } });
    expect(next).not.toHaveBeenCalled();
  });
  test('erro inesperado vira 500 sem expor mensagem técnica', () => {
    const res = criarRes();
    tratarErros(new Error('SELECT segredo FROM usuarios'), { method: 'GET', path: '/tarefas' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: { mensagem: 'Erro interno no servidor' } });
    expect(console.error).toHaveBeenCalled();
  });
  test('erro Prisma P2002 real vira conflito com detalhe público', () => {
    const erro = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002', clientVersion: Prisma.prismaVersion.client, meta: { target: ['email'] },
    });
    const res = criarRes();
    tratarErros(erro, { method: 'POST', path: '/usuarios' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ erro: {
      mensagem: 'Já existe um registro com esse valor', detalhes: ['Valor repetido em: email'],
    } });
  });
});
