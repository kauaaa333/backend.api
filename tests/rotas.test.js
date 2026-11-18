const request = require('supertest');
const jwt = require('jsonwebtoken');

// A consulta de sessão existe no produto real. Só ela é simulada aqui.
jest.mock('../src/models/usuario.model', () => ({
  buscarParaSessao: jest.fn(),
}));
// Se uma rota sem banco alcançar persistência, o teste deve falhar.
jest.mock('../src/database/prisma', () => {
  const proibido = jest.fn(() => { throw new Error('Este teste não pode consultar banco'); });
  return { tarefas: { findMany: proibido, create: proibido }, $connect: proibido };
});
jest.mock('../src/config/database', () => ({
  query: jest.fn(() => { throw new Error('Este teste não pode consultar banco'); }),
}));
const app = require('../app');
const usuarios = require('../src/models/usuario.model');
const prisma = require('../src/database/prisma');
const database = require('../src/config/database');
const token = jwt.sign({ id: 1, versaoUsuarios: 'neon-v1' }, process.env.JWT_SECRET);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  usuarios.buscarParaSessao.mockResolvedValue({ id: 1, nome: 'Teste', administrador: false });
});
afterEach(() => {
  expect(prisma.tarefas.findMany).not.toHaveBeenCalled();
  expect(prisma.tarefas.create).not.toHaveBeenCalled();
  expect(database.query).not.toHaveBeenCalled();
});

describe('rotas sem banco', () => {
  test('importar o ponto de entrada não abre porta e mantém o mesmo app', () => {
    const escutar = jest.spyOn(app, 'listen');
    expect(require('../server')).toBe(app);
    expect(escutar).not.toHaveBeenCalled();
  });
  test('raiz responde 200 com a mensagem da API', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ mensagem: 'TaskFlow API funcionando!' });
  });
  test('rota desconhecida chega ao tratamento de erro 404', async () => {
    const r = await request(app).get('/nao-existe');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ erro: { mensagem: 'Rota GET /nao-existe não encontrada' } });
  });
  test('tarefas sem token são barradas antes da sessão', async () => {
    const r = await request(app).get('/tarefas');
    expect(r.status).toBe(401);
    expect(usuarios.buscarParaSessao).not.toHaveBeenCalled();
  });
  test('token malformado não chega à sessão', async () => {
    const r = await request(app).get('/tarefas').set('Authorization', 'Bearer abc.def.ghi');
    expect(r.status).toBe(401);
    expect(usuarios.buscarParaSessao).not.toHaveBeenCalled();
  });
  test('texto vazio é barrado pela validação da rota POST', async () => {
    const r = await request(app).post('/tarefas').set('Authorization', 'Bearer ' + token).send({ texto: '' });
    expect(r.status).toBe(400);
    expect(r.body.erro.mensagem).toBe('Dados inválidos');
    expect(usuarios.buscarParaSessao).toHaveBeenCalledWith(1);
  });
  test('Content-Type diferente de JSON é recusado antes da sessão', async () => {
    const r = await request(app).post('/tarefas').set('Authorization', 'Bearer ' + token).type('text').send('texto solto');
    expect(r.status).toBe(415);
    expect(usuarios.buscarParaSessao).not.toHaveBeenCalled();
  });
  // Protege a montagem do autenticar na rota de prioridades.
  test('prioridades sem token respondem 401', async () => {
    expect((await request(app).get('/prioridades')).status).toBe(401);
  });
  // Exercita a verificação da assinatura, sem simular jwt.verify.
  test('token com outra chave é recusado', async () => {
    const falso = jwt.sign({ id: 1, versaoUsuarios: 'neon-v1' }, 'outra-chave');
    expect((await request(app).get('/tarefas').set('Authorization', 'Bearer ' + falso)).status).toBe(401);
    expect(usuarios.buscarParaSessao).not.toHaveBeenCalled();
  });
  // Confere o único campo obrigatório do contrato atual.
  test('body vazio retorna os detalhes dos campos obrigatórios', async () => {
    const r = await request(app).post('/tarefas').set('Authorization', 'Bearer ' + token).send({});
    expect(r.status).toBe(400);
    expect(r.body.erro.detalhes).toEqual(["O campo 'texto' é obrigatório"]);
  });
  // Protege a aplicação do enum da coluna na rota, não só na função validar.
  test('coluna fora do enum retorna 400 com detalhe', async () => {
    const r = await request(app).post('/tarefas').set('Authorization', 'Bearer ' + token).send({ texto: 'Estudar', coluna: 'feito' });
    expect(r.status).toBe(400);
    expect(r.body.erro.detalhes).toEqual(["O campo 'coluna' deve ser um de: afazer, andamento, concluido"]);
  });
  // Token não cria uma rota inexistente.
  test('rota inexistente com token também retorna 404', async () => {
    const r = await request(app).get('/rota/que/nao/existe').set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(404);
    expect(usuarios.buscarParaSessao).not.toHaveBeenCalled();
  });
});
