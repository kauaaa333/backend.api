const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');

let servidor;
let urlBase;
let portaDeTeste;
const fetchOriginal = global.fetch;

async function obterPortaLivre() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  server.close();
  await new Promise((resolve) => server.on('close', resolve));
  return port;
}

async function esperarServidorPronto(url, tentativas = 150) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetch(url);
      if (resp.status) return;
    } catch (err) {
      ultimoErro = err;
    }
    // evita loop agressivo
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw ultimoErro || new Error('Servidor não respondeu a tempo');
}

before(async () => {
  await require('./test/fixtures')();
  portaDeTeste = await obterPortaLivre();
  urlBase = `http://127.0.0.1:${portaDeTeste}`;

  servidor = require('node:child_process').spawn(
    process.execPath,
    [path.join(__dirname, 'server.js')],
    {
      stdio: ['ignore', 'ignore', 'inherit'],
      cwd: __dirname,
      env: { ...process.env, PORT: String(portaDeTeste) },
    },
  );

  await esperarServidorPronto(`${urlBase}/tarefas`);

  const respostaLogin = await fetchOriginal(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com', senha: '123456' }),
  });
  const { token } = await respostaLogin.json();

  global.fetch = (url, opcoes = {}) => {
    const destino = new URL(url);
    if (destino.pathname.startsWith('/auth/')) {
      return fetchOriginal(url, opcoes);
    }

    const headers = new Headers(opcoes.headers);
    if (!headers.has('authorization')) {
      headers.set('authorization', `Bearer ${token}`);
    }

    return fetchOriginal(url, { ...opcoes, headers });
  };
});

after(() => {
  global.fetch = fetchOriginal;
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
  assert.equal(tarefas[0].usuario, 'Ana');
  assert.equal(tarefas[0].projeto, 'TaskFlow MVP');
  assert.ok(tarefas.every((tarefa) => !('usuarios' in tarefa) && !('projetos' in tarefa)));
  assert.ok(usuarios.every((usuario) => !('senha_hash' in usuario) && !('senha' in usuario)));
  assert.ok(tarefas.every((tarefa) => 'usuarioId' in tarefa && 'criadoEm' in tarefa));
  const individual = await fetch(`${urlBase}/tarefas/1`);
  assert.equal(individual.status, 200);
  assert.deepEqual(await individual.json(), tarefas.find((tarefa) => tarefa.id === 1));
});

test('UC14 Dia 7 — leituras Prisma preservam relações opcionais, ordenação e erros', async () => {
  const prioridades = await requisicao('GET', '/prioridades');
  assert.equal(prioridades.status, 200);
  assert.ok(prioridades.body.every((p) => p.ativo === true));
  assert.deepEqual(prioridades.body.map((p) => p.id), prioridades.body.map((p) => p.id).sort((a, b) => a - b));
  for (const entidade of ['tarefas', 'projetos']) {
    assert.equal((await requisicao('GET', `/${entidade}/abc`)).status, 400);
    assert.equal((await requisicao('GET', `/${entidade}/2147483648`)).status, 400);
    assert.equal((await requisicao('GET', `/${entidade}/2147483647`)).status, 404);
  }
  const criada = await requisicao('POST', '/tarefas', { texto: 'Prisma sem projeto Dia 7', usuarioId: 1 });
  assert.equal(criada.status, 201);
  try {
    const consulta = await requisicao('GET', `/tarefas/${criada.body.id}`);
    assert.equal(consulta.status, 200);
    assert.equal(consulta.body.usuario, 'Ana');
    assert.equal(consulta.body.projeto, null);
    assert.equal(consulta.body.projetoId, null);
    assert.equal('usuarios' in consulta.body, false);
    assert.equal('senha_hash' in consulta.body, false);
    const tarefas = await requisicao('GET', '/tarefas');
    assert.deepEqual(tarefas.body.map((t) => t.id), tarefas.body.map((t) => t.id).sort((a, b) => a - b));
    assert.ok(tarefas.body.some((t) => t.id === criada.body.id));
    const vinculada = await requisicao('PUT', `/tarefas/${criada.body.id}`, { projetoId: 1 });
    assert.equal(vinculada.status, 200);
    assert.equal((await requisicao('GET', `/tarefas/${criada.body.id}`)).body.projeto, 'TaskFlow MVP');
    const projetos = await requisicao('GET', '/projetos');
    assert.equal(projetos.status, 200);
    assert.deepEqual(projetos.body.map((p) => p.nome), ['Docs UC12', 'TaskFlow MVP']);
    assert.equal((await requisicao('GET', '/projetos/1')).body.usuarioId, 1);
  } finally {
    await requisicao('DELETE', `/tarefas/${criada.body.id}`);
  }
});

test('Middlewares — validarContentType bloqueia POST/PUT sem application/json', async () => {
  // POST /tarefas sem Content-Type: application/json -> 415
  const postSemContentType = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    body: JSON.stringify({
      texto: 'Deve falhar',
      usuarioId: 1,
      idprioridade: 4,
      coluna: 'afazer',
      projetoId: 1,
    }),
  });
  assert.equal(postSemContentType.status, 415);
  assert.deepEqual(await postSemContentType.json(), {
    erro: { mensagem: 'Content-Type inválido. Use: application/json' },
  });

  // PUT /tarefas/:id sem Content-Type: application/json -> 415
  const putSemContentType = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    body: JSON.stringify({ coluna: 'andamento' }),
  });
  assert.equal(putSemContentType.status, 415);
  assert.deepEqual(await putSemContentType.json(), {
    erro: { mensagem: 'Content-Type inválido. Use: application/json' },
  });
});

test('CORS — permite o front-end publicado na Vercel', async () => {
  const resposta = await fetch(`${urlBase}/tarefas`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://task-flow-gamma-inky.vercel.app',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization,content-type',
    },
  });

  assert.equal(resposta.status, 204);
  assert.equal(
    resposta.headers.get('access-control-allow-origin'),
    'https://task-flow-gamma-inky.vercel.app',
  );
  assert.match(resposta.headers.get('access-control-allow-headers'), /authorization/i);
});

test('Estatísticas e ranking de usuários', async () => {
  const geral = await fetch(`${urlBase}/estatisticas`);
  assert.equal(geral.status, 200);
  const jsonGeral = await geral.json();
  assert.equal(jsonGeral.total, 3);
  assert.deepEqual(jsonGeral.porColuna, {
    afazer: 1,
    andamento: 1,
    concluido: 1,
  });
  assert.deepEqual(jsonGeral.porPrioridade, {
    urgente: 0,
    alta: 2,
    media: 1,
    baixa: 0,
    baixissima: 0,
  });
  assert.equal(jsonGeral.prioridadeMaisComum, 'alta');
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

test('usuarioId na criação de tarefa e validação de existência', async () => {
  // Id inexistente -> 400
  const falha = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Tarefa sem dono valido', usuarioId: 9999 }),
  });
  assert.equal(falha.status, 400);
  const jsonFalha = await falha.json();
  assert.deepEqual(jsonFalha, { erro: { mensagem: 'Usuário não encontrado' } });

  // Id válido -> 201
  const sucesso = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texto: 'Tarefa com dono valido',
      usuarioId: 2,
      idprioridade: 2,
      coluna: 'afazer',
    }),
  });
  assert.equal(sucesso.status, 201);
  const nova = await sucesso.json();
  assert.equal(nova.usuarioId, 2);
  assert.equal(nova.texto, 'Tarefa com dono valido');
});

test('Validações obrigatórias e formatos', async () => {
  // Texto ausente
  const semTexto = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idprioridade: 4, coluna: 'afazer' }),
  });
  assert.equal(semTexto.status, 400);
  const jsonSemTexto = await semTexto.json();
  assert.ok(jsonSemTexto.erros || jsonSemTexto.erro);

  // Prioridade inválida
  const prioridadeInvalida = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Texto ok', idprioridade: 99 }),
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

  // Múltiplos erros de validação ao mesmo tempo
  const multiErros = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: 'A', email: 'invalido', senha: '123' }),
  });
  assert.equal(multiErros.status, 400);
  const jsonMulti = await multiErros.json();
  assert.deepEqual(jsonMulti, {
    erro: { mensagem: 'Dados inválidos', detalhes: [
      "O campo 'nome' deve ter ao menos 3 caracteres",
      "O campo 'email' deve ser um email válido",
      "O campo 'senha' deve ter ao menos 6 caracteres",
    ] },
  });

  // Validação no PUT /tarefas/:id
  const putPrioridadeInvalida = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idprioridade: 99 }),
  });
  assert.equal(putPrioridadeInvalida.status, 400);

  const putColunaInvalida = await fetch(`${urlBase}/tarefas/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'feito' }),
  });
  assert.equal(putColunaInvalida.status, 400);
});

test('Proteger usuário com tarefas ao deletar', async () => {
  // Criar um usuário temporário sem tarefas
  const resCriar = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      nome: 'Carlos',
      email: 'carlos@email.com',
      senha: '123456',
    }),
  });
  assert.equal(resCriar.status, 201);
  const carlos = await resCriar.json();

  // Deletar usuário sem tarefas -> 204
  const resDel = await fetch(`${urlBase}/usuarios/${carlos.id}`, {
    method: 'DELETE',
  });
  assert.equal(resDel.status, 204);

  // Tentar deletar usuário com tarefas (Ana, id 1) -> 400
  const resDelAna = await fetch(`${urlBase}/usuarios/1`, { method: 'DELETE' });
  assert.equal(resDelAna.status, 409);
  assert.deepEqual(await resDelAna.json(), {
    erro: { mensagem: 'Usuário possui tarefas. Remova as tarefas antes.' },
  });
});

test('Limite de 2 tarefas em andamento por usuário', async () => {
  // Criar usuário para teste de limite
  const resUser = await fetch(`${urlBase}/usuarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      nome: 'LimiteUser',
      email: 'limite@email.com',
      senha: '123456',
    }),
  });
  const user = await resUser.json();

  // 1ª tarefa em andamento -> 201
  const t1 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texto: 'Andamento 1',
      usuarioId: user.id,
      coluna: 'andamento',
    }),
  });
  assert.equal(t1.status, 201);

  // 2ª tarefa em andamento -> 201
  const t2 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texto: 'Andamento 2',
      usuarioId: user.id,
      coluna: 'andamento',
    }),
  });
  assert.equal(t2.status, 201);

  // 3ª tarefa em andamento -> 400
  const t3 = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texto: 'Andamento 3',
      usuarioId: user.id,
      coluna: 'andamento',
    }),
  });
  assert.equal(t3.status, 400);
  assert.deepEqual(await t3.json(), {
    erro: { mensagem: 'Limite de 2 tarefas em andamento por usuário atingido' },
  });

  // Criar tarefa afazer e tentar mover para andamento via PUT -> 400
  const tAfazer = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texto: 'Afazer',
      usuarioId: user.id,
      coluna: 'afazer',
    }),
  });
  const tAfazerJson = await tAfazer.json();

  const putT3 = await fetch(`${urlBase}/tarefas/${tAfazerJson.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coluna: 'andamento' }),
  });
  assert.equal(putT3.status, 400);
  assert.deepEqual(await putT3.json(), {
    erro: { mensagem: 'Limite de 2 tarefas em andamento por usuário atingido' },
  });
});

test('Data de conclusão automática ao alterar para concluido', async () => {
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

test('Filtrar tarefas por usuário e combinação de filtros', async () => {
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

test('Proteger projeto com tarefas associadas', async () => {
  // Criar projeto sem tarefas
  const resProj = await fetch(`${urlBase}/projetos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      nome: 'Projeto Temporario',
      descricao: 'Sem tarefas',
    }),
  });
  assert.equal(resProj.status, 201);
  const proj = await resProj.json();

  // Deletar projeto sem tarefas -> 204
  const delProj = await fetch(`${urlBase}/projetos/${proj.id}`, {
    method: 'DELETE',
  });
  assert.equal(delProj.status, 204);

  // Tentar deletar projeto com tarefas (Projeto 1) -> 400
  const delProjComTarefas = await fetch(`${urlBase}/projetos/1`, {
    method: 'DELETE',
  });
  assert.equal(delProjComTarefas.status, 409);
  assert.deepEqual(await delProjComTarefas.json(), {
    erro: { mensagem: 'Projeto possui tarefas associadas.' },
  });
});

test('Resumo do projeto (GET /projetos/:id/resumo)', async () => {
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
  assert.deepEqual(await res404.json(), { erro: { mensagem: 'Projeto não encontrado' } });
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
  assert.deepEqual(await senhaInvalida.json(), {
    erro: { mensagem: 'Credenciais inválidas' },
  });

  // 3. Usuário inexistente -> 401
  const usuarioInexistente = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nao@existe.com', senha: '123456' }),
  });
  assert.equal(usuarioInexistente.status, 401);
  assert.deepEqual(await usuarioInexistente.json(), {
    erro: { mensagem: 'Credenciais inválidas' },
  });

  // 4. Campos ausentes -> 400
  const semSenha = await fetch(`${urlBase}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alice@email.com' }),
  });
  assert.equal(semSenha.status, 400);
  assert.deepEqual(await semSenha.json(), {
    erro: { mensagem: 'Email e senha são obrigatórios' },
  });
});

test('Proteção JWT — GET /auth/perfil', async () => {
  const semToken = await fetch(`${urlBase}/auth/perfil`);
  assert.equal(semToken.status, 401);
  assert.deepEqual(await semToken.json(), {
    erro: { mensagem: 'Token de autenticação não informado' },
  });

  const tokenInvalido = await fetch(`${urlBase}/auth/perfil`, {
    headers: { authorization: 'Bearer token-inválido' },
  });
  assert.equal(tokenInvalido.status, 401);
  assert.deepEqual(await tokenInvalido.json(), {
    erro: { mensagem: 'Token de autenticação inválido ou expirado' },
  });

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

test('Proteção JWT — rotas privadas rejeitam token ausente ou inválido', async () => {
  const semToken = await fetchOriginal(`${urlBase}/tarefas`);
  assert.equal(semToken.status, 401);
  assert.deepEqual(await semToken.json(), {
    erro: { mensagem: 'Token de autenticação não informado' },
  });

  const tokenInvalido = await fetchOriginal(`${urlBase}/tarefas`, {
    headers: { authorization: 'Bearer token-invalido' },
  });
  assert.equal(tokenInvalido.status, 401);
  assert.deepEqual(await tokenInvalido.json(), {
    erro: { mensagem: 'Token de autenticação inválido ou expirado' },
  });
});

test('Tarefa sem usuarioId recebe o usuário autenticado', async () => {
  const resposta = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Tarefa do usuário autenticado' }),
  });

  assert.equal(resposta.status, 201);
  assert.equal((await resposta.json()).usuarioId, 3);
});

test('Prioridades — idprioridade como chave estrangeira', async () => {
  // GET /prioridades lista as 5 prioridades, do id 1 (baixissima) ao 5 (urgente)
  const lista = await fetch(`${urlBase}/prioridades`);
  assert.equal(lista.status, 200);
  const prioridades = await lista.json();
  assert.deepEqual(
    prioridades.map((p) => p.descricao),
    ['baixissima', 'baixa', 'media', 'alta', 'urgente'],
  );

  // Sem idprioridade -> padrão 3 (media)
  const semPrioridade = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Sem prioridade informada' }),
  });
  assert.equal(semPrioridade.status, 201);
  const tarefaPadrao = await semPrioridade.json();
  assert.equal(tarefaPadrao.idprioridade, 3);
  assert.equal(tarefaPadrao.prioridade, 'media');

  // Novas prioridades: urgente (5) e baixissima (1)
  for (const idprioridade of [5, 1]) {
    const resposta = await fetch(`${urlBase}/tarefas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: `Prioridade ${idprioridade}`, idprioridade }),
    });
    assert.equal(resposta.status, 201);
    assert.equal((await resposta.json()).idprioridade, idprioridade);
  }

  // Tipo errado (texto), zero e fracionário -> 400
  for (const idprioridade of ['alta', 0, 2.5]) {
    const invalida = await fetch(`${urlBase}/tarefas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'Texto ok', idprioridade }),
    });
    assert.equal(invalida.status, 400, `idprioridade ${idprioridade}`);
  }

  // Compatibilidade com o front antigo: texto 'prioridade' é convertido para o id
  const legado = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Cliente antigo', prioridade: 'alta' }),
  });
  assert.equal(legado.status, 201);
  assert.equal((await legado.json()).idprioridade, 4);

  const legadoInvalido = await fetch(`${urlBase}/tarefas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Cliente antigo', prioridade: 'super' }),
  });
  assert.equal(legadoInvalido.status, 400);

  // PUT troca a prioridade; null é recusado
  const trocar = await fetch(`${urlBase}/tarefas/${tarefaPadrao.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idprioridade: 5 }),
  });
  assert.equal(trocar.status, 200);
  assert.equal((await trocar.json()).idprioridade, 5);

  const nula = await fetch(`${urlBase}/tarefas/${tarefaPadrao.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idprioridade: null }),
  });
  assert.equal(nula.status, 400);

  // Sem token -> 401 (rota privada)
  const semToken = await fetchOriginal(`${urlBase}/prioridades`);
  assert.equal(semToken.status, 401);
});

async function requisicao(method, route, body, token) {
  const resposta = await fetch(`${urlBase}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: resposta.status, body: resposta.status === 204 ? null : await resposta.json() };
}

test('Neon — sessões antigas não reutilizam IDs de usuários dos arrays', async () => {
  const tokenAntigo = require('jsonwebtoken').sign(
    { id: 3, nome: 'Alice' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
  const resposta = await requisicao('GET', '/auth/perfil', undefined, tokenAntigo);
  assert.equal(resposta.status, 401);
});

test('Neon — hashes protegidos, novo usuário e login sem exposição de senha', async () => {
  const novo = await requisicao('POST', '/usuarios', {
    nome: 'Teste Neon',
    email: 'persistencia@teste.com',
    senha: 'Senha-de-teste-123',
  });
  assert.equal(novo.status, 201);
  for (const key of ['senha', 'senha_hash']) assert.equal(key in novo.body, false);
  const login = await requisicao('POST', '/auth/login', {
    email: 'persistencia@teste.com',
    senha: 'Senha-de-teste-123',
  });
  assert.equal(login.status, 200);
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const { rows } = await pool.query('SELECT senha_hash FROM usuarios WHERE id=$1', [
      novo.body.id,
    ]);
    assert.match(rows[0].senha_hash, /^\$2[aby]\$/);
    assert.ok(await require('bcryptjs').compare('Senha-de-teste-123', rows[0].senha_hash));
  } finally {
    await pool.end();
  }
  assert.equal(
    (
      await requisicao('PUT', `/usuarios/${novo.body.id}`, {
        nome: 'Teste Neon',
        email: 'persistencia@teste.com',
        senha: 'Nova-senha-123',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await requisicao('POST', '/auth/login', {
        email: 'persistencia@teste.com',
        senha: 'Senha-de-teste-123',
      })
    ).status,
    401,
  );
  assert.equal((await requisicao('GET', '/prioridades', undefined, login.body.token)).status, 401,
    'Trocar a senha invalida os tokens antigos');
  assert.equal(
    (
      await requisicao('POST', '/auth/login', {
        email: 'persistencia@teste.com',
        senha: 'Nova-senha-123',
      })
    ).status,
    200,
  );
  assert.equal((await requisicao('DELETE', `/usuarios/${novo.body.id}`)).status, 204);
});

test('Neon — comentários, autor, FK e exclusão em cascata', async () => {
  const tarefa = await requisicao('POST', '/tarefas', { texto: 'Comentários de teste' });
  const id = tarefa.body.id;
  const comentario = await requisicao('POST', `/tarefas/${id}/comentarios`, {
    texto: 'Comentário persistido',
  });
  assert.equal(comentario.status, 201);
  assert.equal(comentario.body.usuarioId, 3);
  assert.equal((await requisicao('GET', `/tarefas/${id}/comentarios`)).body.length, 1);
  const ana = await requisicao('POST', '/auth/login', { email: 'ana@email.com', senha: '123456' });
  assert.equal(
    (await requisicao('DELETE', `/comentarios/${comentario.body.id}`, undefined, ana.body.token))
      .status,
    403,
  );
  assert.equal((await requisicao('DELETE', `/comentarios/${comentario.body.id}`)).status, 204);
  assert.equal(
    (await requisicao('POST', `/tarefas/${id}/comentarios`, { texto: '   ' })).status,
    400,
  );
  const segundo = await requisicao('POST', `/tarefas/${id}/comentarios`, {
    texto: 'Excluir com tarefa',
  });
  assert.equal(segundo.status, 201);
  assert.equal((await requisicao('DELETE', `/tarefas/${id}`)).status, 204);
  assert.equal((await requisicao('DELETE', `/comentarios/${segundo.body.id}`)).status, 404);
  assert.equal(
    (await requisicao('POST', '/tarefas/999999/comentarios', { texto: 'Sem tarefa' })).status,
    404,
  );
});

test('Neon — triggers, datas, ordem, histórico e SQL parametrizado', async () => {
  const texto = "Robert'); DROP TABLE usuarios; --";
  const nova = await requisicao('POST', '/tarefas', { texto, coluna: 'concluido', ordem: 7 });
  assert.equal(nova.status, 201);
  assert.equal(nova.body.texto, texto);
  assert.ok(nova.body.concluidaEm);
  assert.equal(nova.body.ordem, 7);
  const id = nova.body.id;
  const repetida = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'concluido' });
  assert.equal(repetida.body.concluidaEm, nova.body.concluidaEm);
  const reaberta = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'afazer' });
  assert.equal(reaberta.body.concluidaEm, null);
  const iniciada = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'andamento' });
  assert.equal(iniciada.status, 200);
  assert.ok(iniciada.body.iniciadaEm);
  const voltou = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'afazer' });
  assert.equal(voltou.body.iniciadaEm, iniciada.body.iniciadaEm);
  const iniciouDeNovo = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'andamento' });
  assert.notEqual(iniciouDeNovo.body.iniciadaEm, iniciada.body.iniciadaEm);
  assert.equal((await requisicao('PUT', `/tarefas/${id}`, { ordem: -1 })).status, 400);
  assert.equal((await requisicao('GET', '/usuarios')).status, 200);
  assert.equal((await requisicao('DELETE', `/tarefas/${id}`)).status, 204);
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const { rows } = await pool.query(
      'SELECT operacao FROM auditoria_tarefas WHERE tarefa_id=$1 ORDER BY id',
      [id],
    );
    assert.deepEqual(
      rows.map((r) => r.operacao),
      ['INSERT', 'UPDATE', 'UPDATE', 'UPDATE', 'UPDATE', 'DELETE'],
    );
  } finally {
    await pool.end();
  }
});

test('Neon — limite de andamento preservado com cinco requisições concorrentes', async () => {
  const usuario = await requisicao('POST', '/usuarios', {
    nome: 'Concorrência',
    email: 'concorrencia@teste.com',
    senha: 'Teste-123456',
  });
  assert.equal(usuario.status, 201);
  const tentativas = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      requisicao('POST', '/tarefas', {
        texto: `Concorrente ${i}`,
        coluna: 'andamento',
        usuarioId: usuario.body.id,
      }),
    ),
  );
  assert.equal(tentativas.filter((r) => r.status === 201).length, 2);
  assert.equal(tentativas.filter((r) => r.status === 400).length, 3);
  for (const r of tentativas.filter((r) => r.status === 201))
    await requisicao('DELETE', `/tarefas/${r.body.id}`);
  await requisicao('DELETE', `/usuarios/${usuario.body.id}`);
});

test('Neon — dados permanecem após reiniciar a API e privilégios restritos', async () => {
  const nova = await requisicao('POST', '/tarefas', { texto: 'Sobrevive ao reinício' });
  assert.equal(nova.status, 201);
  const encerrado = new Promise((resolve) => servidor.once('exit', resolve));
  servidor.kill();
  await encerrado;
  servidor = require('node:child_process').spawn(
    process.execPath,
    [path.join(__dirname, 'server.js')],
    {
      cwd: __dirname,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, PORT: String(portaDeTeste) },
    },
  );
  await esperarServidorPronto(`${urlBase}/tarefas`);
  assert.equal(
    (await requisicao('GET', `/tarefas/${nova.body.id}`)).body.texto,
    'Sobrevive ao reinício',
  );
  await requisicao('DELETE', `/tarefas/${nova.body.id}`);
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      "SELECT current_user AS usuario, has_table_privilege(current_user,'auditoria_tarefas','DELETE') AS apagar_historico,has_table_privilege(current_user,'prioridades','UPDATE') AS editar_prioridades",
    );
    assert.equal(rows[0].usuario, 'app_usuario');
    assert.equal(rows[0].apagar_historico, false);
    assert.equal(rows[0].editar_prioridades, false);
  } finally {
    await pool.end();
  }
});

test('Segurança — usuário comum só consulta suas tarefas e estatísticas', async () => {
  const login = await requisicao('POST', '/auth/login', {
    email: 'ana@email.com',
    senha: '123456',
  });
  const token = login.body.token;
  const lista = await requisicao('GET', '/tarefas', undefined, token);
  assert.equal(lista.status, 200);
  assert.ok(lista.body.every((t) => t.usuarioId === 1));
  assert.equal((await requisicao('GET', '/tarefas/3', undefined, token)).status, 404);
  assert.equal(
    (await requisicao('PUT', '/tarefas/3', { texto: 'Tentativa indevida' }, token)).status,
    404,
  );
  assert.equal((await requisicao('DELETE', '/tarefas/3', undefined, token)).status, 404);
  assert.deepEqual((await requisicao('GET', '/tarefas?usuarioId=2', undefined, token)).body, []);
  const stats = await requisicao('GET', '/tarefas/estatisticas', undefined, token);
  assert.equal(stats.status, 200);
  assert.equal(
    stats.body.total,
    Object.values(stats.body.porColuna).reduce((a, b) => a + b, 0),
  );
  assert.ok(stats.body.rankingUsuarios.every((u) => u.usuarioId === 1));
});

test('Segurança — não permite atribuição indevida, projeto alheio ou escalada de perfil', async () => {
  const ana = await requisicao('POST', '/auth/login', { email: 'ana@email.com', senha: '123456' });
  const token = ana.body.token;
  assert.equal(
    (await requisicao('POST', '/tarefas', { texto: 'Outro responsável', usuarioId: 2 }, token))
      .status,
    403,
  );
  assert.equal((await requisicao('PUT', '/tarefas/1', { usuarioId: 2 }, token)).status, 403);
  assert.equal((await requisicao('PUT', '/tarefas/1', { usuarioId: null }, token)).status, 403);
  assert.equal(
    (await requisicao('POST', '/tarefas', { texto: 'Projeto alheio', projetoId: 2 }, token)).status,
    400,
  );
  for (const [method, body] of [
    ['GET', undefined],
    ['PUT', { nome: 'Invasão' }],
    ['DELETE', undefined],
  ])
    assert.equal((await requisicao(method, '/projetos/2', body, token)).status, 404);
  assert.equal((await requisicao('GET', '/projetos/2/tarefas', undefined, token)).status, 404);
  assert.equal((await requisicao('GET', '/projetos/2/resumo', undefined, token)).status, 404);
  const falsaClaim = require('jsonwebtoken').sign(
    { id: 1, versaoUsuarios: 'neon-v1', administrador: true },
    process.env.JWT_SECRET,
  );
  assert.equal((await requisicao('GET', '/tarefas/3', undefined, falsaClaim)).status, 404);
  const novo = await requisicao(
    'POST',
    '/usuarios',
    {
      nome: 'Sem privilégio',
      email: 'perfil@teste.com',
      senha: 'Senha-segura-123',
      administrador: true,
    },
    token,
  );
  assert.equal(novo.status, 201);
  assert.equal(novo.body.administrador, false);
  await requisicao('DELETE', `/usuarios/${novo.body.id}`);
});

test('Segurança — contas de outras pessoas não podem ser consultadas, editadas ou apagadas', async () => {
  const ana = await requisicao('POST', '/auth/login', { email: 'ana@email.com', senha: '123456' });
  const token = ana.body.token;
  assert.deepEqual(
    (await requisicao('GET', '/usuarios', undefined, token)).body.map((u) => u.id),
    [1],
  );
  assert.equal((await requisicao('GET', '/usuarios/2', undefined, token)).status, 404);
  assert.equal(
    (
      await requisicao(
        'PUT',
        '/usuarios/2',
        { nome: 'Nome indevido', email: 'outro@teste.com', senha: 'Outra-senha' },
        token,
      )
    ).status,
    404,
  );
  assert.equal((await requisicao('DELETE', '/usuarios/2', undefined, token)).status, 404);
  assert.equal((await requisicao('GET', '/usuarios/1', undefined, token)).status, 200);
});

test('Segurança — comentários respeitam o acesso à tarefa e o autor', async () => {
  const tarefa = await requisicao('POST', '/tarefas', { texto: 'Privada da Alice' });
  const ana = await requisicao('POST', '/auth/login', { email: 'ana@email.com', senha: '123456' });
  const token = ana.body.token;
  assert.equal(
    (await requisicao('GET', `/tarefas/${tarefa.body.id}/comentarios`, undefined, token)).status,
    404,
  );
  assert.equal(
    (
      await requisicao(
        'POST',
        `/tarefas/${tarefa.body.id}/comentarios`,
        { texto: 'Intruso' },
        token,
      )
    ).status,
    404,
  );
  const propria = await requisicao('POST', '/tarefas', { texto: 'Privada da Ana' }, token);
  const comentario = await requisicao(
    'POST',
    `/tarefas/${propria.body.id}/comentarios`,
    { texto: 'Autorizado' },
    token,
  );
  assert.equal(comentario.status, 201);
  const bruno = await requisicao('POST', '/auth/login', {
    email: 'bruno@email.com',
    senha: '123456',
  });
  assert.equal(
    (await requisicao('DELETE', `/comentarios/${comentario.body.id}`, undefined, bruno.body.token))
      .status,
    403,
  );
  await requisicao('DELETE', `/tarefas/${propria.body.id}`, undefined, token);
  await requisicao('DELETE', `/tarefas/${tarefa.body.id}`);
});

test('Auditoria — registra o ator real, mantém o responsável e não vaza contexto entre transações', async () => {
  const tarefa = await requisicao('POST', '/tarefas', {
    texto: 'Auditoria de administrador',
    usuarioId: 1,
  });
  assert.equal(tarefa.status, 201);
  const id = tarefa.body.id;
  const mudou = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'concluido' });
  assert.equal(mudou.status, 200);
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const { rows } = await pool.query(
      'SELECT operacao,alterado_por,responsavel_id,origem FROM auditoria_tarefas WHERE tarefa_id=$1 ORDER BY id',
      [id],
    );
    assert.deepEqual(
      rows.map((r) => [r.alterado_por, r.responsavel_id, r.origem]),
      [
        [3, 1, 'api'],
        [3, 1, 'api'],
      ],
    );
    await pool.query("UPDATE tarefas SET coluna='afazer' WHERE id=$1", [id]);
    const direto = (
      await pool.query(
        'SELECT alterado_por,origem FROM auditoria_tarefas WHERE tarefa_id=$1 ORDER BY id DESC LIMIT 1',
        [id],
      )
    ).rows[0];
    assert.deepEqual(direto, { alterado_por: null, origem: 'banco' });
  } finally {
    await pool.end();
  }
  await requisicao('DELETE', `/tarefas/${id}`);
});

test('Banco — rejeita status inglês e registra avanço direto pelo SQL', async () => {
  const tarefa = await requisicao('POST', '/tarefas', { texto: 'Rotina de avanço', usuarioId: 2 });
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await assert.rejects(
      pool.query("UPDATE tarefas SET coluna='todo' WHERE id=$1", [tarefa.body.id]),
      { code: '23514' },
    );
    assert.equal(
      (await pool.query('SELECT avancar_tarefa($1) AS coluna', [tarefa.body.id])).rows[0].coluna,
      'andamento',
    );
    assert.equal(
      (await pool.query('SELECT avancar_tarefa($1) AS coluna', [tarefa.body.id])).rows[0].coluna,
      'concluido',
    );
    const row = (
      await pool.query('SELECT iniciada_em,concluida_em FROM tarefas WHERE id=$1', [tarefa.body.id])
    ).rows[0];
    assert.ok(row.iniciada_em);
    assert.ok(row.concluida_em);
  } finally {
    await pool.end();
  }
  await requisicao('DELETE', `/tarefas/${tarefa.body.id}`);
});

test('Segurança — token de conta removida não continua válido', async () => {
  const novo = await requisicao('POST', '/usuarios', {
    nome: 'Conta temporária',
    email: 'revogar@teste.com',
    senha: 'Senha-de-teste-123',
  });
  const login = await requisicao('POST', '/auth/login', {
    email: 'revogar@teste.com',
    senha: 'Senha-de-teste-123',
  });
  assert.equal(login.status, 200);
  await requisicao('DELETE', `/usuarios/${novo.body.id}`);
  assert.equal((await requisicao('GET', '/prioridades', undefined, login.body.token)).status, 401);
});

test('UC14 Dia 3 — prioridade inativa não aparece no select, mas a tarefa existente é preservada', async () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const criada = await requisicao('POST', '/tarefas', { texto: 'Prioridade desativada UC14', idprioridade: 1 });
  assert.equal(criada.status, 201);
  try {
    await pool.query('UPDATE prioridades SET ativo=false WHERE id=1');
    const lista = await requisicao('GET', '/prioridades');
    assert.equal(lista.status, 200);
    assert.ok(lista.body.every((p) => p.ativo === true && p.id !== 1));
    const nova = await requisicao('POST', '/tarefas', { texto: 'Deve recusar inativa', idprioridade: 1 });
    assert.equal(nova.status, 400);
    const editada = await requisicao('PUT', `/tarefas/${criada.body.id}`, { texto: 'Texto preservado', idprioridade: 1 });
    assert.equal(editada.status, 200);
    assert.equal(editada.body.idprioridade, 1);
    assert.equal((await requisicao('GET', '/estatisticas')).status, 200);
  } finally {
    await pool.query('UPDATE prioridades SET ativo=true WHERE id=1');
    await pool.end();
    await requisicao('DELETE', `/tarefas/${criada.body.id}`);
  }
});

test('UC14 Dia 3 — responsável, projeto, prioridade e conclusão ficam no PostgreSQL', async () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const criada = await requisicao('POST', '/tarefas', {
    texto: 'Persistência completa UC14', usuarioId: 1, projetoId: 1, idprioridade: 3,
  });
  assert.equal(criada.status, 201);
  try {
    const editada = await requisicao('PUT', `/tarefas/${criada.body.id}`, {
      texto: 'Responsável e projeto alterados', usuarioId: 2, projetoId: 2, idprioridade: 4,
    });
    assert.equal(editada.status, 200);
    const concluida = await requisicao('PUT', `/tarefas/${criada.body.id}`, { coluna: 'concluido' });
    assert.equal(concluida.status, 200);
    const { rows: [row] } = await pool.query('SELECT texto,usuario_id,projeto_id,idprioridade,coluna,concluida_em FROM tarefas WHERE id=$1', [criada.body.id]);
    assert.equal(row.usuario_id, 2);
    assert.equal(row.projeto_id, 2);
    assert.equal(row.idprioridade, 4);
    assert.equal(row.coluna, 'concluido');
    assert.ok(row.concluida_em);
    assert.equal((await requisicao('GET', `/tarefas/${criada.body.id}`)).body.texto, row.texto);
    const legado = await requisicao('PUT', `/tarefas/${criada.body.id}`, { prioridade: 'urgente' });
    assert.equal(legado.status, 200);
    assert.equal(legado.body.idprioridade, 5);
    const stats = await requisicao('GET', '/estatisticas?usuarioId=2');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.filtro.usuarioId, '2');
    const doUsuario = await requisicao('GET', '/tarefas?usuarioId=2');
    assert.equal(stats.body.total, doUsuario.body.length);
    assert.equal((await requisicao('DELETE', `/tarefas/${criada.body.id}`)).status, 204);
    assert.equal((await pool.query('SELECT id FROM tarefas WHERE id=$1', [criada.body.id])).rowCount, 0);
  } finally {
    await requisicao('DELETE', `/tarefas/${criada.body.id}`);
    await pool.end();
  }
});

test('UC14 Dia 8 — gravações Prisma devolvem nomes completos e preservam PUT parcial', async () => {
  const criada = await requisicao('POST', '/tarefas', {
    texto: 'Gravação Prisma Dia 8', usuarioId: '1', projetoId: '1', idprioridade: '4', ordem: 0,
  });
  assert.equal(criada.status, 201);
  const id = criada.body.id;
  try {
    assert.equal(criada.body.usuario, 'Ana');
    assert.equal(criada.body.projeto, 'TaskFlow MVP');
    assert.equal(criada.body.prioridade, 'alta');
    assert.equal(criada.body.usuarioId, 1);
    assert.equal(criada.body.projetoId, 1);
    assert.equal('usuarios' in criada.body, false);
    assert.equal('prioridades' in criada.body, false);
    const editada = await requisicao('PUT', `/tarefas/${id}`, { texto: 'Edição Prisma Dia 8' });
    assert.equal(editada.status, 200);
    assert.equal(editada.body.projetoId, 1);
    assert.equal(editada.body.idprioridade, 4);
    assert.equal(editada.body.prioridade, 'alta');
    const semProjeto = await requisicao('PUT', `/tarefas/${id}`, { projetoId: null });
    assert.equal(semProjeto.status, 200);
    assert.equal(semProjeto.body.projeto, null);
    assert.equal(semProjeto.body.projetoId, null);
    const concluida = await requisicao('PUT', `/tarefas/${id}`, { coluna: 'concluido' });
    assert.equal(concluida.status, 200);
    assert.ok(concluida.body.concluidaEm);
    assert.deepEqual((await requisicao('GET', `/tarefas/${id}`)).body, concluida.body);
  } finally {
    assert.equal((await requisicao('DELETE', `/tarefas/${id}`)).status, 204);
  }
  assert.equal((await requisicao('DELETE', `/tarefas/${id}`)).status, 404);
});

test('UC14 Dia 8 — CRUD Prisma de usuário, projeto e comentário, com conflitos 409', async () => {
  const senha = 'Senha-teste-Prisma-8';
  const usuario = await requisicao('POST', '/usuarios', {
    nome: 'Usuário Prisma 8', email: 'prisma-dia8@teste.com', senha,
  });
  assert.equal(usuario.status, 201);
  assert.equal('senha_hash' in usuario.body, false);
  assert.equal('senha' in usuario.body, false);
  const login = await requisicao('POST', '/auth/login', { email: 'prisma-dia8@teste.com', senha });
  assert.equal(login.status, 200);
  const token = login.body.token;
  let projeto;
  let tarefa;
  try {
    const duplicado = await requisicao('POST', '/usuarios', {
      nome: 'Outro nome', email: 'PRISMA-DIA8@TESTE.COM', senha,
    });
    assert.equal(duplicado.status, 409);
    assert.match(duplicado.body.erro.detalhes[0], /email/);
    const editado = await requisicao('PUT', `/usuarios/${usuario.body.id}`, {
      nome: 'Usuário Prisma editado', email: 'prisma-dia8-editado@teste.com',
    }, token);
    assert.equal(editado.status, 200);
    assert.equal('senha_hash' in editado.body, false);
    assert.equal((await requisicao('POST', '/auth/login', {
      email: 'prisma-dia8-editado@teste.com', senha,
    })).status, 200);
    projeto = await requisicao('POST', '/projetos', { nome: 'Projeto Prisma Dia 8' }, token);
    assert.equal(projeto.status, 201);
    const projetoEditado = await requisicao('PUT', `/projetos/${projeto.body.id}`, {
      descricao: 'Descrição pelo Prisma',
    }, token);
    assert.equal(projetoEditado.status, 200);
    assert.equal(projetoEditado.body.nome, 'Projeto Prisma Dia 8');
    assert.equal((await requisicao('POST', '/projetos', { nome: ' projeto prisma dia 8 ' }, token)).status, 409);
    tarefa = await requisicao('POST', '/tarefas', {
      texto: 'Tarefa vinculada Prisma 8', projetoId: String(projeto.body.id),
    }, token);
    assert.equal(tarefa.status, 201);
    assert.equal(tarefa.body.usuario, 'Usuário Prisma editado');
    assert.equal(tarefa.body.projeto, 'Projeto Prisma Dia 8');
    assert.equal((await requisicao('DELETE', `/usuarios/${usuario.body.id}`)).status, 409);
    assert.equal((await requisicao('DELETE', `/projetos/${projeto.body.id}`, undefined, token)).status, 409);
    const comentario = await requisicao('POST', `/tarefas/${tarefa.body.id}/comentarios`, {
      texto: 'Comentário gravado com Prisma',
    }, token);
    assert.equal(comentario.status, 201);
    assert.equal(comentario.body.usuarioId, usuario.body.id);
    assert.equal(comentario.body.tarefaId, tarefa.body.id);
    assert.equal((await requisicao('DELETE', `/comentarios/${comentario.body.id}`, undefined, token)).status, 204);
  } finally {
    if (tarefa?.status === 201) await requisicao('DELETE', `/tarefas/${tarefa.body.id}`, undefined, token);
    if (projeto?.status === 201) await requisicao('DELETE', `/projetos/${projeto.body.id}`, undefined, token);
    await requisicao('DELETE', `/usuarios/${usuario.body.id}`);
  }
  assert.equal((await requisicao('GET', `/usuarios/${usuario.body.id}`)).status, 404);
});

test('UC14 Dia 8 — banco gera P2002, P2003 e P2025 reais com tradução apropriada', async () => {
  const { PrismaClient } = require('@prisma/client');
  const traduzir = require('./src/utils/traduzirErroPrisma');
  const client = new PrismaClient(); // DATABASE_URL já foi definida pela fixture isolada.
  try {
    for (const [operacao, code, metodo, status] of [
      [() => client.usuarios.create({ data: { nome: 'Duplicado', email: 'ana@email.com', senha_hash: 'teste-que-nao-sera-gravado' } }), 'P2002', 'POST', 409],
      [() => client.projetos.create({ data: { nome: 'Projeto com FK inexistente', usuario_id: 2147483647 } }), 'P2003', 'POST', 400],
      [() => client.usuarios.delete({ where: { id: 1 } }), 'RESTRICT', 'DELETE', 409],
      [() => client.tarefas.delete({ where: { id: 2147483647 } }), 'P2025', 'DELETE', 404],
    ]) {
      await assert.rejects(operacao(), (erro) => {
        if (code === 'RESTRICT') {
          assert.ok(erro.code === 'P2003' || erro.name === 'PrismaClientUnknownRequestError');
        } else assert.equal(erro.code, code);
        assert.equal(traduzir(erro, metodo).status, status);
        return true;
      });
    }
  } finally {
    await client.$disconnect();
  }
});
