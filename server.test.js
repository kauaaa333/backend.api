const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

let servidor;
let urlBase;
const portaDeTeste = 3107;

before(async () => {
  servidor = require('node:child_process').spawn(process.execPath, ['server.js'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, PORT: String(portaDeTeste) },
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
  urlBase = `http://127.0.0.1:${portaDeTeste}`;
});

after(() => servidor.kill());

test('estatísticas retornam os totais, filtro e resumo dinâmico', async () => {
  const geral = await fetch(`${urlBase}/estatisticas`);
  assert.equal(geral.status, 200);
  assert.deepEqual(await geral.json(), {
    filtro: null,
    total: 3,
    porColuna: { afazer: 1, andamento: 1, concluido: 1 },
    porPrioridade: { alta: 2, media: 1, baixa: 0 },
    colunaComMaisTarefas: 'afazer',
    prioridadeMaisComum: 'alta',
  });

  const filtrada = await fetch(`${urlBase}/estatisticas?coluna=afazer`);
  assert.equal(filtrada.status, 200);
  assert.equal((await filtrada.json()).total, 1);

  const resumo = await fetch(`${urlBase}/estatisticas/resumo`);
  assert.equal(resumo.status, 200);
  assert.match((await resumo.json()).resumo, /Você tem 3 tarefa\(s\)/);
});

test('CRUD de usuários impede e-mails duplicados', async () => {
  const criado = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Ana', email: 'ana@example.com', senha: 'segredo' }),
  });
  assert.equal(criado.status, 201);
  const usuario = await criado.json();

  const duplicado = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Outra Ana', email: 'ANA@example.com', senha: 'outra-senha' }),
  });
  assert.equal(duplicado.status, 409);

  const atualizado = await fetch(`${urlBase}/usuarios/${usuario.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Ana Silva', email: 'ana.silva@example.com', senha: 'nova-senha' }),
  });
  assert.equal(atualizado.status, 200);

  const removido = await fetch(`${urlBase}/usuarios/${usuario.id}`, { method: 'DELETE' });
  assert.equal(removido.status, 200);
});
