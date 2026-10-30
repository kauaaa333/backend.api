const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@apidevtools/swagger-parser');
const spec = require('../src/docs/openapi');
const app = require('../server');
let server, base;
before(async () => { server = app.listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise(r => server.close(r)));

test('OpenAPI válido, com todas as referências resolvidas', async () => {
  await parser.validate(JSON.parse(JSON.stringify(spec)), { resolve: { external: false } });
});
test('Cada operação real tem documentação e nenhuma rota de negócio inventada', () => {
  const reais = [];
  const montagens = { auth: '/auth', tarefas: '/tarefas', projetos: '/projetos', usuarios: '/usuarios', prioridades: '/prioridades', estatisticas: '/estatisticas', comentarios: '' };
  for (const [arquivo, prefixo] of Object.entries(montagens)) {
    const source = fs.readFileSync(path.join(__dirname, '../src/routes', `${arquivo}.routes.js`), 'utf8');
    for (const match of source.matchAll(/router\.(get|post|put|delete)\('([^']+)'/g)) {
      const url = (prefixo + (match[2] === '/' ? '' : match[2])).replace(/:([A-Za-z]+)/g, '{$1}');
      reais.push(`${match[1]} ${url}`);
    }
  }
  const documentadas = Object.entries(spec.paths).flatMap(([url, methods]) => Object.keys(methods).map(m => `${m} ${url}`));
  assert.deepEqual(documentadas.sort(), reais.sort());
});
test('Contrato usa nomes reais, PUT parcial, exclusão 204 e schemas públicos sem hash', () => {
  assert.deepEqual(spec.components.schemas.TarefaEntrada.required, ['texto']);
  assert.equal(spec.components.schemas.TarefaAtualizacao.required, undefined);
  assert.ok(spec.components.schemas.Tarefa.properties.usuarioId);
  assert.equal(spec.components.schemas.Tarefa.properties.usuario_id, undefined);
  assert.equal(spec.paths['/tarefas/{id}'].delete.responses[204].content, undefined);
  assert.equal(spec.components.schemas.Usuario.properties.senha_hash, undefined);
  assert.equal(spec.components.schemas.Usuario.properties.senha, undefined);
  assert.deepEqual(spec.paths['/auth/login'].post.security, []);
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
});
test('Página, JSON e recursos Swagger acessíveis sem login', async () => {
  const page = await fetch(base + '/docs/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /swagger-ui/);
  const json = await fetch(base + '/docs/openapi.json');
  assert.equal(json.status, 200);
  assert.deepEqual(await json.json(), spec);
  for (const file of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js', 'swagger-ui-init.js']) {
    const r = await fetch(base + '/docs/' + file);
    assert.equal(r.status, 200, file);
    assert.match(r.headers.get('content-type'), file.endsWith('.css') ? /text\/css/ : /javascript/, file);
    assert.ok((await r.text()).length > 100, file);
  }
});
test('Documentação não libera as rotas protegidas e não persiste autorização', async () => {
  const r = await fetch(base + '/tarefas');
  assert.equal(r.status, 401);
  assert.equal(typeof (await r.json()).erro.mensagem, 'string');
  const init = await (await fetch(base + '/docs/swagger-ui-init.js')).text();
  assert.match(init, /"persistAuthorization": false/);
  assert.match(init, /"validatorUrl": null/);
});
