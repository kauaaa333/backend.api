const request = require('supertest');
let app, prisma, pool, token, prioridadeId, totalInicial;
const tarefasCriadas = new Set();

beforeAll(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await require('../../test/fixtures')();
  app = require('../../app');
  prisma = require('../../src/database/prisma');
  pool = require('../../src/config/database').pool;
  const login = await request(app).post('/auth/login').send({ email: 'ana@email.com', senha: '123456' });
  expect(login.status).toBe(200);
  token = login.body.token;
  const prioridade = await prisma.prioridades.findFirst({ where: { ativo: true }, orderBy: { id: 'asc' } });
  expect(prioridade).not.toBeNull();
  prioridadeId = prioridade.id;
  totalInicial = await prisma.tarefas.count();
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

async function criarTarefa() {
  const r = await request(app).post('/tarefas').set('Authorization', 'Bearer ' + token).send({
    texto: 'Tarefa criada pelo Supertest', coluna: 'afazer',
    usuarioId: 1, projetoId: 1, idprioridade: prioridadeId,
  });
  if (Number.isInteger(r.body.id)) tarefasCriadas.add(r.body.id);
  expect(r.status).toBe(201);
  expect(r.body).toHaveProperty('id');
  return r.body;
}

afterEach(async () => {
  if (!prisma) return;
  // Executa mesmo quando um expect falha: não deixa tarefa nova para o próximo caso.
  for (const id of tarefasCriadas) await prisma.tarefas.deleteMany({ where: { id } });
  tarefasCriadas.clear();
  expect(await prisma.tarefas.count()).toBe(totalInicial);
});
afterAll(async () => {
  await prisma?.$disconnect();
  await pool?.end();
});

describe('rotas com banco isolado', () => {
  test('prioridades com sessão real retornam uma lista', async () => {
    const r = await request(app).get('/prioridades').set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
  test('cria, confirma no Prisma, exclui e confirma ausência no banco', async () => {
    const tarefa = await criarTarefa();
    const salva = await prisma.tarefas.findUnique({ where: { id: tarefa.id } });
    expect(salva.texto).toBe('Tarefa criada pelo Supertest');
    const r = await request(app).delete('/tarefas/' + tarefa.id).set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(204);
    expect(await prisma.tarefas.findUnique({ where: { id: tarefa.id } })).toBeNull();
  });
  test('id inexistente retorna 404 após consultar o banco', async () => {
    const r = await request(app).get('/tarefas/2147483647').set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(404);
    expect(r.body.erro.mensagem).toBe('Tarefa não encontrada');
  });
  test('tarefas com token retornam lista', async () => {
    const r = await request(app).get('/tarefas').set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });
  test('projetos próprios com token retornam lista', async () => {
    const r = await request(app).get('/projetos').set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.every(p => p.usuarioId === 1)).toBe(true);
  });
  test('busca a tarefa criada com o mesmo texto e exclui no fim', async () => {
    const tarefa = await criarTarefa();
    const r = await request(app).get('/tarefas/' + tarefa.id).set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(200);
    expect(r.body.texto).toBe(tarefa.texto);
    expect((await request(app).delete('/tarefas/' + tarefa.id).set('Authorization', 'Bearer ' + token)).status).toBe(204);
  });
  test('buscar o id realmente excluído retorna 404', async () => {
    const tarefa = await criarTarefa();
    expect((await request(app).delete('/tarefas/' + tarefa.id).set('Authorization', 'Bearer ' + token)).status).toBe(204);
    const r = await request(app).get('/tarefas/' + tarefa.id).set('Authorization', 'Bearer ' + token);
    expect(r.status).toBe(404);
  });
});
