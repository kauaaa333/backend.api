const prisma = require('../database/prisma');
const formatar = require('../database/formatar');
const registroOuNull = require('../database/operacao');
const criarErro = require('../utils/criarErro');
const { podeAcessar } = require('../utils/acesso');

const include = {
  projetos: { select: { nome: true } },
  usuarios: { select: { nome: true } },
  prioridades: { select: { descricao: true } },
};
const listar = async (where) =>
  (
    await prisma.tarefas.findMany({ where, include, orderBy: { id: 'asc' } })
  ).map(formatar);
const buscar = async (id) =>
  formatar(await prisma.tarefas.findUnique({ where: { id }, include }));

function dadosDaTarefa(dados) {
  const campos = {
    texto: 'texto',
    coluna: 'coluna',
    idprioridade: 'idprioridade',
    usuarioId: 'usuario_id',
    projetoId: 'projeto_id',
    ordem: 'ordem',
  };
  const numericos = new Set([
    'idprioridade',
    'usuarioId',
    'projetoId',
    'ordem',
  ]);
  // Datas pertencem aos triggers; IDs, nomes de relações e campos arbitrários não entram.
  return Object.fromEntries(
    Object.entries(campos)
      .filter(([campo]) => dados[campo] !== undefined)
      .map(([campo, coluna]) => [
        coluna,
        numericos.has(campo) && dados[campo] !== null
          ? Number(dados[campo])
          : dados[campo],
      ]),
  );
}

async function escrever(operacao, id, dados, ator) {
  if (!ator || !Number.isInteger(ator.id))
    throw criarErro(404, 'Tarefa não encontrada');
  return registroOuNull(() =>
    prisma.$transaction(
      async (tx) => {
        // São controles do PostgreSQL, não CRUD: o lock e o ator ficam na MESMA
        // conexão/transação das operações Prisma e são liberados no commit/rollback.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(731309)`;
        await tx.$queryRaw`SELECT set_config('app.usuario_id', ${String(ator.id)}, true)`;
        if (id)
          await tx.$queryRaw`SELECT id FROM tarefas WHERE id = ${id} FOR UPDATE`;
        const atual = id
          ? await tx.tarefas.findUnique({ where: { id } })
          : null;
        if (id && !podeAcessar(ator, formatar(atual)))
          throw criarErro(404, 'Tarefa não encontrada');
        if (operacao === 'remover')
          return formatar(await tx.tarefas.delete({ where: { id }, include }));

        const data = dadosDaTarefa(dados);
        const usuarioId =
          data.usuario_id !== undefined
            ? data.usuario_id
            : (atual?.usuario_id ?? ator.id);
        if (!ator.administrador && usuarioId !== ator.id)
          throw criarErro(
            403,
            'Não é permitido atribuir a tarefa a outro usuário',
          );
        if (data.projeto_id != null) {
          const projeto = await tx.projetos.findUnique({
            where: { id: data.projeto_id },
          });
          if (!podeAcessar(ator, formatar(projeto)))
            throw criarErro(404, 'Projeto não encontrado');
        }
        const coluna = data.coluna ?? atual?.coluna ?? 'afazer';
        if (usuarioId != null && coluna === 'andamento') {
          const total = await tx.tarefas.count({
            where: {
              usuario_id: usuarioId,
              coluna: 'andamento',
              ...(id ? { id: { not: id } } : {}),
            },
          });
          if (total >= 2)
            throw criarErro(
              400,
              'Limite de 2 tarefas em andamento por usuário atingido',
            );
        }
        const tarefa =
          operacao === 'adicionar'
            ? await tx.tarefas.create({
                data: { ...data, usuario_id: usuarioId },
                include,
              })
            : await tx.tarefas.update({ where: { id }, data, include });
        return formatar(tarefa);
      },
      { maxWait: 15000, timeout: 15000, isolationLevel: 'ReadCommitted' },
    ),
  );
}

module.exports = {
  listar,
  buscar,
  buscarPorId: buscar,
  listarAcessiveis: (ator) =>
    listar(ator.administrador ? undefined : { usuario_id: ator.id }),
  buscarAcessivel: async (id, ator) => {
    const tarefa = await buscar(id);
    return podeAcessar(ator, tarefa) ? tarefa : undefined;
  },
  listarPorColuna: (coluna) => listar({ coluna }),
  listarPorUsuario: (id) => listar({ usuario_id: id }),
  listarPorProjeto: (id) => listar({ projeto_id: id }),
  adicionar: (dados, ator) => escrever('adicionar', null, dados, ator),
  atualizar: (id, dados, ator) => escrever('atualizar', id, dados, ator),
  remover: (id, ator) => escrever('remover', id, null, ator),
};
