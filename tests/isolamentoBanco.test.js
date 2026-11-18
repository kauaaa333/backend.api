const { validarBanco } = require('../test/validar-banco');
const config = {
  teste: 'postgresql://teste:teste@ep-test.example/db',
  aplicacao: 'postgresql://app:teste@ep-test-pooler.example/db',
  hostEsperado: 'ep-test.example',
  producao: 'postgresql://app:teste@ep-main-pooler.example/db',
};

describe('travas do banco de teste', () => {
  test('aceita base isolada e credenciais distintas no mesmo banco', () => {
    expect(validarBanco(config).appUrl).toBe(config.aplicacao);
  });
  test('bloqueia produção mesmo com endpoint pooled', () => {
    expect(() => validarBanco({ ...config, producao: config.aplicacao })).toThrow('banco da aplicação');
  });
  test('recusa host sem confirmação', () => {
    expect(() => validarBanco({ ...config, hostEsperado: '' })).toThrow('HOST');
  });
  test('recusa aplicação apontando a outro banco antes das fixtures', () => {
    expect(() => validarBanco({ ...config, aplicacao: 'postgresql://app:teste@ep-test.example/outra' })).toThrow('mesma base');
  });
  test('recusa aplicação apontando a outro endpoint', () => {
    expect(() => validarBanco({ ...config, aplicacao: config.producao })).toThrow('mesma base');
  });
  test('erro de URL inválida não inclui credenciais', () => {
    expect(() => validarBanco({ ...config, teste: 'senha-secreta' })).toThrow('Configuração de banco de teste inválida');
  });
  test('fixtures inválidas param antes de construir o pool', async () => {
    const seguranca = require('../test/validar-banco');
    const pg = require('pg');
    const pool = jest.spyOn(pg, 'Pool');
    jest.spyOn(seguranca, 'carregarConfiguracao').mockImplementation(() => {
      throw new Error('Banco bloqueado antes de conectar');
    });
    await expect(require('../test/fixtures')()).rejects.toThrow('Banco bloqueado antes de conectar');
    expect(pool).not.toHaveBeenCalled();
  });
});
