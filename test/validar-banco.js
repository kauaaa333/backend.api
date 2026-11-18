const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function lerUrl(valor) {
  try {
    const url = new URL(valor);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error('Configuração de banco de teste inválida. Confira os arquivos locais, sem publicar as URLs.');
  }
}

function endpoint(url) {
  return url.hostname.toLowerCase().replace('-pooler.', '.');
}

function validarBanco({ teste, aplicacao, hostEsperado, producao }) {
  const url = lerUrl(teste);
  const app = lerUrl(aplicacao || teste);
  if (!hostEsperado || url.hostname !== hostEsperado)
    throw new Error('Banco de teste bloqueado: confirme TEST_DATABASE_EXPECTED_HOST.');
  if (endpoint(app) !== endpoint(url) || app.pathname !== url.pathname || app.port !== url.port)
    throw new Error('A aplicação de testes precisa usar a mesma base isolada das fixtures.');
  if (producao && endpoint(lerUrl(producao)) === endpoint(url))
    throw new Error('Testes não podem limpar o banco da aplicação.');
  return { url: url.toString(), appUrl: app.toString() };
}

function carregarConfiguracao() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test.local'), quiet: true });
  const arquivo = path.resolve(__dirname, '../.env');
  const principal = fs.existsSync(arquivo) ? dotenv.parse(fs.readFileSync(arquivo)).DATABASE_URL : undefined;
  const config = {
    teste: process.env.TEST_DATABASE_URL,
    aplicacao: process.env.TEST_APP_DATABASE_URL,
    hostEsperado: process.env.TEST_DATABASE_EXPECTED_HOST,
    producao: principal || (process.env.AMBIENTE !== 'teste' ? process.env.DATABASE_URL : undefined),
  };
  // Sem referência de produção, só aceitar o banco efêmero conhecido do CI.
  const localCI = (() => {
    const u = lerUrl(config.teste);
    return ['localhost', '127.0.0.1'].includes(u.hostname) && u.pathname === '/taskflow_ci';
  })();
  if (!config.producao && !localCI)
    throw new Error('Falta a referência do banco da aplicação para conferir o isolamento.');
  return validarBanco(config);
}

module.exports = { validarBanco, carregarConfiguracao };
