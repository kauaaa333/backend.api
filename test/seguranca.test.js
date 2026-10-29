const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deepmerge } = require('deepmerge-ts');
const { producao, senhaAceita } = require('../src/utils/politicaSenha');

test('Correção deepmerge: ciclos não esgotam a pilha e configurações comuns continuam mesclando', () => {
  const a = {}; const b = {}; a.self = a; b.self = b;
  assert.doesNotThrow(() => deepmerge(a, b));
  assert.deepEqual(deepmerge({ db: { a: 1 } }, { db: { b: 2 } }), { db: { a: 1, b: 2 } });
});

test('Produção recusa credenciais didáticas e exige uma senha forte sem truncamento bcrypt', () => {
  const anterior = process.env.TASKFLOW_PRODUCTION_SECURITY;
  process.env.TASKFLOW_PRODUCTION_SECURITY = 'true';
  try {
    assert.equal(producao(), true);
    assert.equal(senhaAceita('123456'), false);
    assert.equal(senhaAceita('curta'), false);
    assert.equal(senhaAceita('Uma-senha-forte-de-teste-2026'), true);
    assert.equal(senhaAceita('😀'.repeat(20)), false);
  } finally {
    if (anterior === undefined) delete process.env.TASKFLOW_PRODUCTION_SECURITY;
    else process.env.TASKFLOW_PRODUCTION_SECURITY = anterior;
  }
});
