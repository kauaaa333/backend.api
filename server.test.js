const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');

let servidor;
let urlBase;
let portaDeTeste;

async function obterPortaLivre() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  server.close();
  await new Promise((resolve) => server.on('close', resolve));
  return port;
}

async function esperarServidorPronto(url, tentativas = 30) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return;
    } catch (err) {
      ultimoErro = err;
    }
    // evita loop agressivo
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw ultimoErro || new Error('Servidor não respondeu a tempo');
}

before(async () => {
  portaDeTeste = await obterPortaLivre();
  urlBase = `http://127.0.0.1:${portaDeTeste}`;

  servidor = require('node:child_process').spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    stdio: ['ignore', 'ignore', 'ignore'],
    cwd: __dirname,
    env: { ...process.env, PORT: String(portaDeTeste) },
  });

  await esperarServidorPronto(`${urlBase}/tarefas`);
});

after(() => {
  if (servidor) servidor.kill();
});

test('MVC Completo — GET inicial em todas as entidades', async () => {
  const resTarefas = await fetch(`${urlBase}/tarefas`);
  assert.equal(resTarefas.status, 200);
  const tarefas = await resTarefas.json();
  assert.ok(Array.isArray(tarefas));

  const resUsuarios = await fetch(`${urlBase}/usuarios`);
  assert.equal(resUsuarios.status, 200);
  const usuarios = await resUsuarios.json();
  assert.ok(Array.isArray(usuarios));

  const resProjetos = await fetch(`${urlBase}/projetos`);
  assert.equal(resProjetos.status, 200);
  const projetos = await resProjetos.json();
  assert.ok(Array.isArray(projetos));
});

test('Middlewares — validarContentType bloqueia POST/PUT sem application/json', async () => {
  // POST /tarefas sem Content-Type: application/json -> 415
  const postSemContentType = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    body: JSON.stringify({ texto: 'Deve falhar', usuarioId: 1, prioridade: 'alta', coluna: 'afazer', projetoId: 1 }),
  });
  assert.equal(postSemContentType.status, 415);
  assert.deepEqual(await postSemContentType.json(), {
    erro: 'Content-Type inválido. Use: application/json',
  });

  // PUT /tarefas/:id sem Content-Type: application/json -> 415
  const putSemContentType = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    body: JSON.stringify({ coluna: 'andamento' }),
  });
  assert.equal(putSemContentType.status, 415);
  assert.deepEqual(await putSemContentType.json(), {
    erro: 'Content-Type inválido. Use: application/json',
  });
});

test('Estatísticas e Nível 2A (Ranking de Usuários)', async () => {
  const geral = await fetch(`${urlBase}/estatisticas`);
  assert.equal(geral.status, 200);
  const jsonGeral = await geral.json();
  assert.equal(jsonGeral.total, 3);
  assert.deepEqual(jsonGeral.porColuna, { afazer: 1, andamento: 1, concluido: 1 });
  assert.deepEqual(jsonGeral.porPrioridade, { alta: 2, media: 1, baixa: 0 });
  assert.ok(Array.isArray(jsonGeral.rankingUsuarios));
  assert.equal(jsonGeral.rankingUsuarios[0].nome, 'Ana');
  assert.equal(jsonGeral.rankingUsuarios[0].totalTarefas, 2);

  // Também testar via GET /tarefas/estatisticas
  const tarefasStats = await fetch(`${urlBase}/tarefas/estatisticas`);
  assert.equal(tarefasStats.status, 200);
  const jsonTarefasStats = await tarefasStats.json();
  assert.deepEqual(jsonTarefasStats.rankingUsuarios, jsonGeral.rankingUsuarios);

  const resumo = await fetch(`${urlBase}/estatisticas/resumo`);
  assert.equal(resumo.status, 200);
  const jsonResumo = await resumo.json();
  assert.match(jsonResumo.resumo, /Você tem 3 tarefa\(s\)/);
});

test('Base A — usuarioId na criação de tarefa e validação de existência', async () => {
  // Id inexistente -> 400
  const falha = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Tarefa sem dono valido', usuarioId: 9999 }),
  });
  assert.equal(falha.status, 400);
  const jsonFalha = await falha.json();
  assert.deepEqual(jsonFalha, { erro: 'Usuário não encontrado' });

  // Id válido -> 201
  const sucesso = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Tarefa com dono valido', usuarioId: 2, prioridade: 'baixa', coluna: 'afazer' }),
  });
  assert.equal(sucesso.status, 201);
  const nova = await sucesso.json();
  assert.equal(nova.usuarioId, 2);
  assert.equal(nova.texto, 'Tarefa com dono valido');
});

test('Base B e Validação com Schemas — Validações obrigatórias e formatos', async () => {
  // Texto ausente
  const semTexto = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prioridade: 'alta', coluna: 'afazer' }),
  });
  assert.equal(semTexto.status, 400);
  const jsonSemTexto = await semTexto.json();
  assert.ok(jsonSemTexto.erros || jsonSemTexto.erro);

  // Prioridade inválida
  const prioridadeInvalida = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Texto ok', prioridade: 'urgente' }),
  });
  assert.equal(prioridadeInvalida.status, 400);
  const jsonPri = await prioridadeInvalida.json();
  assert.ok(jsonPri.erros || jsonPri.erro);

  // Coluna inválida
  const colunaInvalida = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Texto ok', coluna: 'feito' }),
  });
  assert.equal(colunaInvalida.status, 400);
  const jsonCol = await colunaInvalida.json();
  assert.ok(jsonCol.erros || jsonCol.erro);

  // Múltiplos erros de validação ao mesmo tempo (Slide 160)
  const multiErros = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'A', email: 'invalido', senha: '123' }),
  });
  assert.equal(multiErros.status, 400);
  const jsonMulti = await multiErros.json();
  assert.deepEqual(jsonMulti, {
    erros: [
      "O campo 'nome' deve ter ao menos 3 caracteres",
      "O campo 'email' deve ser um email válido",
      "O campo 'senha' deve ter ao menos 6 caracteres",
    ],
  });

  // Validação no PUT /tarefas/:id
  const putPrioridadeInvalida = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prioridade: 'urgente' }),
  });
  assert.equal(putPrioridadeInvalida.status, 400);

  const putColunaInvalida = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'feito' }),
  });
  assert.equal(putColunaInvalida.status, 400);
});

test('Base C — Proteger usuário com tarefas ao deletar', async () => {
  // Criar um usuário temporário sem tarefas
  const resCriar = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Carlos', email: 'carlos@email.com', senha: '123456' }),
  });
  assert.equal(resCriar.status, 201);
  const carlos = await resCriar.json();

  // Deletar usuário sem tarefas -> 200
  const resDel = await fetch(`${urlBase}/usuarios/${carlos.id}`, { method: 'DELETE' });
  assert.equal(resDel.status, 200);

  // Tentar deletar usuário com tarefas (Ana, id 1) -> 400
  const resDelAna = await fetch(`${urlBase}/usuarios/1`, { method: 'DELETE' });
  assert.equal(resDelAna.status, 400);
  assert.deepEqual(await resDelAna.json(), { erro: 'Usuário possui tarefas. Remova as tarefas antes.' });
});

test('Nível 1A — Limite de 2 tarefas em andamento por usuário', async () => {
  // Criar usuário para teste de limite
  const resUser = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'LimiteUser', email: 'limite@email.com', senha: '123456' }),
  });
  const user = await resUser.json();

  // 1ª tarefa em andamento -> 201
  const t1 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Andamento 1', usuarioId: user.id, coluna: 'andamento' }),
  });
  assert.equal(t1.status, 201);

  // 2ª tarefa em andamento -> 201
  const t2 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Andamento 2', usuarioId: user.id, coluna: 'andamento' }),
  });
  assert.equal(t2.status, 201);

  // 3ª tarefa em andamento -> 400
  const t3 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Andamento 3', usuarioId: user.id, coluna: 'andamento' }),
  });
  assert.equal(t3.status, 400);
  assert.deepEqual(await t3.json(), { erro: 'Limite de 2 tarefas em andamento por usuário atingido' });

  // Criar tarefa afazer e tentar mover para andamento via PUT -> 400
  const tAfazer = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Afazer', usuarioId: user.id, coluna: 'afazer' }),
  });
  const tAfazerJson = await tAfazer.json();

  const putT3 = await fetch(`${urlBase}/tarefas/${tAfazerJson.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'andamento' }),
  });
  assert.equal(putT3.status, 400);
  assert.deepEqual(await putT3.json(), { erro: 'Limite de 2 tarefas em andamento por usuário atingido' });
});

test('Nível 1B — Data de conclusão automática ao alterar para concluido', async () => {
  // Criar tarefa afazer
  const res = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Para concluir', coluna: 'afazer' }),
  });
  const tarefa = await res.json();
  assert.equal(tarefa.concluidaEm, null);

  // Mover para concluido via PUT
  const putConcluido = await fetch(`${urlBase}/tarefas/${tarefa.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'concluido' }),
  });
  assert.equal(putConcluido.status, 200);
  const tarefaConcluida = await putConcluido.json();
  assert.ok(tarefaConcluida.concluidaEm);
  assert.ok(!isNaN(Date.parse(tarefaConcluida.concluidaEm)));

  // Mover de volta para andamento
  const putAndamento = await fetch(`${urlBase}/tarefas/${tarefa.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'andamento' }),
  });
  assert.equal(putAndamento.status, 200);
  const tarefaAndamento = await putAndamento.json();
  assert.equal(tarefaAndamento.concluidaEm, null);
});

test('Nível 1C — Filtrar tarefas por usuário e combinação de filtros', async () => {
  const porUsuario = await fetch(`${urlBase}/tarefas?usuarioId=1`);
  assert.equal(porUsuario.status, 200);
  const jsonUser = await porUsuario.json();
  assert.ok(jsonUser.every((t) => t.usuarioId === 1));

  const porUsuarioEColuna = await fetch(`${urlBase}/tarefas?usuarioId=1&coluna=afazer`);
  assert.equal(porUsuarioEColuna.status, 200);
  const jsonUserCol = await porUsuarioEColuna.json();
  assert.ok(jsonUserCol.every((t) => t.usuarioId === 1 && t.coluna === 'afazer'));

  const usuarioInexistente = await fetch(`${urlBase}/tarefas?usuarioId=99999`);
  assert.equal(usuarioInexistente.status, 200);
  const jsonVazio = await usuarioInexistente.json();
  assert.deepEqual(jsonVazio, []);
});

test('Nível 2B — Proteger projeto com tarefas associadas', async () => {
  // Criar projeto sem tarefas
  const resProj = await fetch(`${urlBase}/projetos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'Projeto Temporario', descricao: 'Sem tarefas' }),
  });
  assert.equal(resProj.status, 201);
  const proj = await resProj.json();

  // Deletar projeto sem tarefas -> 200
  const delProj = await fetch(`${urlBase}/projetos/${proj.id}`, { method: 'DELETE' });
  assert.equal(delProj.status, 200);

  // Tentar deletar projeto com tarefas (Projeto 1) -> 400
  const delProjComTarefas = await fetch(`${urlBase}/projetos/1`, { method: 'DELETE' });
  assert.equal(delProjComTarefas.status, 400);
  assert.deepEqual(await delProjComTarefas.json(), { erro: 'Projeto possui tarefas associadas.' });
});

test('Nível 2C — Resumo do projeto (GET /projetos/:id/resumo)', async () => {
  const resResumo = await fetch(`${urlBase}/projetos/1/resumo`);
  assert.equal(resResumo.status, 200);
  const jsonResumo = await resResumo.json();

  assert.equal(jsonResumo.projeto.id, 1);
  assert.equal(typeof jsonResumo.totalTarefas, 'number');
  assert.ok(jsonResumo.porColuna);
  assert.equal(typeof jsonResumo.porColuna.afazer, 'number');
  assert.equal(typeof jsonResumo.porColuna.andamento, 'number');
  assert.equal(typeof jsonResumo.porColuna.concluido, 'number');

  // Projeto inexistente -> 404
  const res404 = await fetch(`${urlBase}/projetos/99999/resumo`);
  assert.equal(res404.status, 404);
  assert.deepEqual(await res404.json(), { erro: 'Projeto não encontrado' });
});

test('Autenticação JWT — POST /auth/login', async () => {
  // 1. Sucesso -> 200
  const loginSucesso = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com', senha: '123456' }),
  });
  assert.equal(loginSucesso.status, 200);
  const jsonSucesso = await loginSucesso.json();
  assert.ok(jsonSucesso.token);
  assert.deepEqual(jsonSucesso.usuario, { id: 3, nome: 'Alice' });

  // 2. Senha incorreta -> 401
  const senhaInvalida = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com', senha: 'errada' }),
  });
  assert.equal(senhaInvalida.status, 401);
  assert.deepEqual(await senhaInvalida.json(), { erro: 'Credenciais inválidas' });

  // 3. Usuário inexistente -> 401
  const usuarioInexistente = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nao@existe.com', senha: '123456' }),
  });
  assert.equal(usuarioInexistente.status, 401);
  assert.deepEqual(await usuarioInexistente.json(), { erro: 'Credenciais inválidas' });

  // 4. Campos ausentes -> 400
  const semSenha = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com' }),
  });
  assert.equal(semSenha.status, 400);
  assert.deepEqual(await semSenha.json(), { erro: 'Email e senha são obrigatórios' });
});

test('Proteção JWT — GET /auth/perfil', async () => {
  const semToken = await fetch(`${urlBase}/auth/perfil`);
  assert.equal(semToken.status, 401);
  assert.deepEqual(await semToken.json(), { erro: 'Token de autenticação não informado' });

  const tokenInvalido = await fetch(`${urlBase}/auth/perfil`, {
    headers: { authorization: 'Bearer token-inválido' },
  });
  assert.equal(tokenInvalido.status, 401);
  assert.deepEqual(await tokenInvalido.json(), { erro: 'Token de autenticação inválido ou expirado' });

  const login = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com', senha: '123456' }),
  });
  const { token } = await login.json();

  const perfil = await fetch(`${urlBase}/auth/perfil`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(perfil.status, 200);
  assert.deepEqual(await perfil.json(), {
    id: 3,
    nome: 'Alice',
    email: 'alice@email.com',
  });
});
