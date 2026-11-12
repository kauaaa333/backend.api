const criarErro = require('../src/utils/criarErro');

describe('criarErro', () => {
  test('devolve um Error com o status e a mensagem informados', () => {
    const erro = criarErro(404, 'Tarefa não encontrada');

    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(404);
    expect(erro.message).toBe('Tarefa não encontrada');
  });

  test('guarda os detalhes quando informados', () => {
    const detalhes = ["O campo 'texto' é obrigatório"];

    const erro = criarErro(400, 'Dados inválidos', detalhes);

    expect(erro.detalhes[0]).toBe("O campo 'texto' é obrigatório");
  });

  test('deixa detalhes undefined quando não informados', () => {
    const erro = criarErro(404, 'Tarefa não encontrada');

    expect(erro.detalhes).toBeUndefined();
  });
});
