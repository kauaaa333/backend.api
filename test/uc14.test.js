const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const validar = require('../src/middlewares/validar');
const schemas = require('../src/middlewares/schemas');
const tratarErros = require('../src/middlewares/erro.middleware');

// Testa o Express real com models substituídos apenas neste processo.
// Não abre conexão nem altera banco algum.
const usuario = { id: 1, nome: 'Teste', email: 'teste@example.com', administrador: true };
let consultasTarefas = 0;
let falhar = false;
let consultasLogin = 0;
const tarefa = { id: 1, texto: 'Teste UC14', usuarioId: 1, coluna: 'afazer', idprioridade: 3 };
function model(nome, exports) {
  require.cache[require.resolve(`../src/models/${nome}.model`)] = { exports };
}
model('usuario', {
  buscar: async () => usuario,
  buscarPorEmail: async () => usuario,
  autenticar: async () => { consultasLogin++; return null; },
});
model('tarefa', {
  buscarAcessivel: async (id) => {
    consultasTarefas++;
    if (falhar) throw new Error('SELECT senha_hash FROM usuarios: segredo-interno');
    return id === 1 ? tarefa : null;
  },
  listarAcessiveis: async () => { consultasTarefas++; return []; },
  remover: async (id) => id === 1 ? tarefa : null,
  adicionar: async (dados) => ({ id: 2, ...dados }),
  atualizar: async (id, dados) => ({ ...tarefa, ...dados }),
});
model('projeto', {
  buscar: async (id) => id === 1 ? { id, usuarioId: 1 } : null,
  buscarPorNome: async () => null,
  adicionar: async (dados) => ({ id: 2, ...dados }),
});
model('prioridade', {
  ID_PADRAO: 3,
  buscar: async (id) => ({ id, ativo: true }),
});
model('comentario', {});

let servidor;
let base;
let token;
before(async () => {
  process.env.TASKFLOW_PRODUCTION_SECURITY = 'false';
  process.env.JWT_SECRET = 'segredo-exclusivo-uc14-sem-banco';
  const app = require('../server');
  servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
  token = jwt.sign({ id: 1, versaoUsuarios: 'neon-v1' }, process.env.JWT_SECRET);
});
after(async () => {
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
});
async function enviar(rota, method = 'GET', body) {
  const resposta = await fetch(`${base}${rota}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  return { status: resposta.status, body: resposta.status === 204 ? await resposta.text() : await resposta.json() };
}

for (const rota of ['/tarefas/abc', '/tarefas/0', '/tarefas/-1', '/tarefas/1.5', '/tarefas/2147483648', '/projetos/2147483648', '/usuarios/abc', '/projetos/abc', '/projetos/abc/tarefas', '/tarefas/abc/comentarios', '/comentarios/abc']) {
  test(`ID inválido é 400: ${rota}`, async () => {
    const antes = consultasTarefas;
    const resposta = await enviar(rota, rota.startsWith('/comentarios/') ? 'DELETE' : 'GET');
    assert.equal(resposta.status, 400);
    assert.match(resposta.body.erro.detalhes[0], /'id'/);
    assert.equal(consultasTarefas, antes);
  });
}
for (const filtro of ['usuarioId=abc', 'usuarioId=-1', 'usuarioId=1.5', 'usuarioId=2147483648', 'usuarioId=1&usuarioId=2', 'projetoId=0', 'coluna=invalida']) {
  test(`Filtro inválido é 400 antes do model: ${filtro}`, async () => {
    const antes = consultasTarefas;
    assert.equal((await enviar(`/tarefas?${filtro}`)).status, 400);
    assert.equal(consultasTarefas, antes);
  });
}
test('Sem filtro e filtro válido continuam funcionando', async () => {
  assert.equal((await enviar('/tarefas')).status, 200);
  assert.equal((await enviar('/tarefas?usuarioId=1')).status, 200);
});
test('ID é validado antes do body no PUT', async () => {
  const resposta = await enviar('/tarefas/abc', 'PUT', {});
  assert.equal(resposta.status, 400);
  assert.equal(resposta.body.erro.detalhes.length, 1);
  assert.match(resposta.body.erro.detalhes[0], /'id'/);
});
test('Body ausente, vazio, array e JSON quebrado são 400', async () => {
  for (const body of [undefined, {}, [], '{"texto":']) {
    const resposta = await enviar('/tarefas', 'POST', body);
    assert.equal(resposta.status, 400);
    assert.equal(typeof resposta.body.erro.mensagem, 'string');
  }
});
test('POST sem Content-Type e sem body retorna 400 com detalhes', async () => {
  const resposta = await fetch(`${base}/tarefas`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  assert.equal(resposta.status, 400);
  assert.ok(Array.isArray((await resposta.json()).erro.detalhes));
});
test('FKs inválidas são recusadas no body', async () => {
  for (const campo of ['usuarioId', 'projetoId', 'idprioridade']) {
    for (const valor of [1.5, -1, 0, true, []]) {
      const resposta = await enviar('/tarefas', 'POST', { texto: 'Teste', [campo]: valor });
      assert.equal(resposta.status, 400);
      assert.match(resposta.body.erro.detalhes[0], new RegExp(campo));
    }
  }
});
test('Tarefa inexistente: GET, PUT e DELETE retornam 404 sem detalhes', async () => {
  for (const metodo of ['GET', 'PUT', 'DELETE']) {
    const resposta = await enviar('/tarefas/99999', metodo, metodo === 'PUT' ? { texto: 'Teste' } : undefined);
    assert.equal(resposta.status, 404);
    assert.deepEqual(resposta.body, { erro: { mensagem: 'Tarefa não encontrada' } });
  }
});
test('Rota desconhecida retorna JSON 404 mesmo sem autenticação', async () => {
  const resposta = await fetch(`${base}/rota-que-nao-existe`);
  assert.equal(resposta.status, 404);
  assert.deepEqual(await resposta.json(), { erro: { mensagem: 'Rota GET /rota-que-nao-existe não encontrada' } });
});
test('Falha inesperada não expõe detalhes internos', async () => {
  falhar = true;
  try {
    const resposta = await enviar('/tarefas/1');
    assert.equal(resposta.status, 500);
    assert.deepEqual(resposta.body, { erro: { mensagem: 'Erro interno no servidor' } });
  } finally { falhar = false; }
});

test('Produção bloqueia a senha didática antes de consultar o hash', async () => {
  const anterior = process.env.TASKFLOW_PRODUCTION_SECURITY;
  process.env.TASKFLOW_PRODUCTION_SECURITY = 'true';
  const antes = consultasLogin;
  try {
    assert.equal((await enviar('/auth/login', 'POST', { email: 'teste@example.com', senha: '123456' })).status, 401);
    assert.equal(consultasLogin, antes);
  } finally {
    if (anterior === undefined) delete process.env.TASKFLOW_PRODUCTION_SECURITY;
    else process.env.TASKFLOW_PRODUCTION_SECURITY = anterior;
  }
});
test('POST retorna 201, PUT parcial 200 e DELETE 204 sem corpo', async () => {
  assert.equal((await enviar('/tarefas', 'POST', { texto: 'Teste' })).status, 201);
  assert.equal((await enviar('/tarefas/1', 'PUT', { coluna: 'andamento' })).status, 200);
  assert.deepEqual(await enviar('/tarefas/1', 'DELETE'), { status: 204, body: '' });
});
test('Projeto sem descrição continua aceito', async () => {
  assert.equal((await enviar('/projetos', 'POST', { nome: 'UC14' })).status, 201);
});
test('Inteiro obrigatório em params não é ignorado em PUT', () => {
  assert.throws(() => validar(schemas.id, 'params')({ method: 'PUT', params: {} }, {}, () => {}), { status: 400 });
});
test('Erros 500 omitem detalhes e violações SQL conhecidas são traduzidas', () => {
  for (const [erro, esperado] of [
    [Object.assign(new Error('interno'), { detalhes: ['segredo'] }), 500],
    [Object.assign(new Error('SQL'), { code: '23505' }), 409],
    [Object.assign(new Error('SQL'), { code: '23503' }), 400],
  ]) {
    let corpo;
    const res = { status(status) { assert.equal(status, esperado); return this; }, json(value) { corpo = value; } };
    tratarErros(erro, { method: 'GET', path: '/teste' }, res, () => {});
    assert.equal(typeof corpo.erro.mensagem, 'string');
    assert.equal('detalhes' in corpo.erro, false);
  }
});
