const formatar = require('../src/database/formatar');

function registro() {
  return {
    id: 7, texto: 'Estudar Jest', usuario_id: 1, projeto_id: 2,
    usuarios: { nome: 'Ana' }, projetos: { nome: 'TaskFlow' },
    prioridades: { descricao: 'alta', cor: '#EF4444' },
  };
}

describe('formato público da tarefa', () => {
  test('achata as relações e usa os nomes esperados pelo frontend', () => {
    expect(formatar(registro())).toEqual({
      id: 7, texto: 'Estudar Jest', usuarioId: 1, projetoId: 2,
      usuario: 'Ana', projeto: 'TaskFlow', prioridade: 'alta', prioridadeCor: '#EF4444',
    });
  });
  test('não devolve as relações aninhadas', () => {
    const tarefa = formatar(registro());
    expect(tarefa).not.toHaveProperty('usuarios');
    expect(tarefa).not.toHaveProperty('projetos');
    expect(tarefa).not.toHaveProperty('prioridades');
  });
  test('aceita relações ausentes', () => {
    expect(formatar({ id: 1, usuarios: null, projetos: null, prioridades: undefined })).toEqual({
      id: 1, usuario: null, projeto: null, prioridade: null, prioridadeCor: null,
    });
  });
  test('não altera o registro recebido', () => {
    const entrada = registro();
    const copia = structuredClone(entrada);
    formatar(entrada);
    expect(entrada).toEqual(copia);
  });
  test('registro não encontrado continua null', () => {
    expect(formatar(null)).toBeNull();
  });
});
