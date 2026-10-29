const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const tratarErros = require('../src/middlewares/erro.middleware');
const traduzir = require('../src/utils/traduzirErroPrisma');
const registroOuNull = require('../src/database/operacao');
const formatar = require('../src/database/formatar');

function erroPrisma(code, meta) {
  return new Prisma.PrismaClientKnownRequestError(
    'Detalhes internos não devem vazar',
    {
      code,
      clientVersion: Prisma.prismaVersion.client,
      meta,
    },
  );
}

for (const [code, method, status] of [
  ['P2002', 'POST', 409],
  ['P2003', 'POST', 400],
  ['P2003', 'PUT', 400],
  ['P2003', 'DELETE', 409],
  ['P2025', 'PUT', 404],
  ['P2025', 'DELETE', 404],
  ['P2000', 'POST', 400],
  ['P2004', 'POST', 400],
  ['P2011', 'POST', 400],
]) {
  test(`Prisma ${code} em ${method} retorna ${status} no middleware real`, () => {
    let body;
    tratarErros(
      erroPrisma(code, { target: ['email'] }),
      { method, path: '/teste-isolado' },
      {
        status(actual) {
          assert.equal(actual, status);
          return this;
        },
        json(value) {
          body = value;
        },
      },
      () => {},
    );
    assert.equal(typeof body.erro.mensagem, 'string');
    assert.equal(JSON.stringify(body).includes('Detalhes internos'), false);
    if (code === 'P2002') assert.match(body.erro.detalhes[0], /email/);
  });
}

test('Prisma desconhecido continua sendo 500 sem expor metadados ou detalhes', () => {
  const erro = Object.assign(erroPrisma('P9999', { target: ['segredo'] }), {
    detalhes: ['segredo'],
  });
  assert.equal(traduzir(erro, 'POST'), erro);
  tratarErros(
    erro,
    { method: 'POST', path: '/teste-isolado' },
    {
      status(status) {
        assert.equal(status, 500);
        return this;
      },
      json(body) {
        assert.deepEqual(body, {
          erro: { mensagem: 'Erro interno no servidor' },
        });
      },
    },
    () => {},
  );
  assert.equal(
    traduzir(
      erroPrisma('P2002', { target: ['senha_hash', 'indice_interno'] }),
      'POST',
    ).detalhes,
    undefined,
  );
});

test('P2025 vira null no model; falhas diferentes não são engolidas', async () => {
  assert.equal(
    await registroOuNull(async () => {
      throw erroPrisma('P2025');
    }),
    null,
  );
  const erro = erroPrisma('P2003');
  await assert.rejects(
    registroOuNull(async () => {
      throw erro;
    }),
    (falha) => falha === erro,
  );
});

test('RESTRICT do Neon no Prisma 6 retorna 409 sem transformar qualquer erro desconhecido em conflito', () => {
  const restricao = new Prisma.PrismaClientUnknownRequestError(
    'ConnectorError: QueryError(PostgresError { code: "23001", message: "detalhe interno" })',
    { clientVersion: Prisma.prismaVersion.client },
  );
  tratarErros(
    restricao,
    { method: 'DELETE', path: '/teste-isolado' },
    {
      status(status) {
        assert.equal(status, 409);
        return this;
      },
      json(body) {
        assert.equal(JSON.stringify(body).includes('detalhe interno'), false);
      },
    },
    () => {},
  );
  const desconhecido = new Prisma.PrismaClientUnknownRequestError(
    'Falha 23001 em contexto desconhecido',
    {
      clientVersion: Prisma.prismaVersion.client,
    },
  );
  assert.equal(traduzir(desconhecido, 'DELETE'), desconhecido);
});

test('Formato público mantém nomes, campos camelCase e relações opcionais', () => {
  assert.deepEqual(
    formatar({
      id: 1,
      usuario_id: 2,
      projeto_id: null,
      usuarios: { nome: 'Ana' },
      projetos: null,
      prioridades: { descricao: 'alta' },
    }),
    {
      id: 1,
      usuarioId: 2,
      projetoId: null,
      usuario: 'Ana',
      projeto: null,
      prioridade: 'alta',
    },
  );
});
