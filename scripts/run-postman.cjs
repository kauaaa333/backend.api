const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ quiet: true });
const baseUrl = process.env.TASKFLOW_POSTMAN_BASE_URL || 'http://localhost:3002';
const production = new URL(baseUrl).hostname === 'backend-api-black-seven.vercel.app';
if (production) {
  if (process.env.TASKFLOW_POSTMAN_ALLOW_PRODUCTION !== 'true') throw new Error('Confirme explicitamente a execução que cria registros temporários em produção.');
  require('dotenv').config({ path: '.env.admin.local', quiet: true });
} else if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) {
  throw new Error('Destino de teste não autorizado.');
}
const newman = require(path.resolve('tmp/postman-runner/node_modules/newman'));
newman.run({
  collection: require('../postman/TaskFlow-UC14.postman_collection.json'),
  environment: { values: [
    { key: 'baseUrl', value: baseUrl, enabled: true },
    { key: 'email', value: production ? process.env.TASKFLOW_ADMIN_EMAIL : 'ana@email.com', enabled: true },
    { key: 'senha', value: production ? process.env.TASKFLOW_ADMIN_INITIAL_PASSWORD : '123456', enabled: true },
  ] },
  reporters: [], timeoutRequest: 30000,
}, (erro, summary) => {
  if (erro) { console.error(erro.message); process.exitCode = 1; return; }
  const report = { ambiente: production ? 'produção' : 'teste local isolado',
    requests: summary.run.stats.requests, assertions: summary.run.stats.assertions,
    failures: summary.run.failures.map((f) => ({ request: f.source?.name, error: f.error?.name })),
  };
  fs.mkdirSync('tmp/validacao-final', { recursive: true });
  // Relatório sanitizado: nunca exportar requests/responses que contêm senha ou token.
  fs.writeFileSync('tmp/validacao-final/postman-' + (production ? 'producao' : 'local') + '.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (report.failures.length) process.exitCode = 1;
});
