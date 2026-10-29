const prisma = require('../database/prisma');
const formatar = require('../database/formatar');
const registroOuNull = require('../database/operacao');
module.exports = {
  listar: async () =>
    (await prisma.comentarios.findMany({ orderBy: { id: 'asc' } })).map(
      formatar,
    ),
  buscar: async (id) =>
    formatar(await prisma.comentarios.findUnique({ where: { id } })),
  listarPorTarefa: async (tarefaId) =>
    (
      await prisma.comentarios.findMany({
        where: { tarefa_id: tarefaId },
        orderBy: [{ criado_em: 'asc' }, { id: 'asc' }],
      })
    ).map(formatar),
  adicionar: async ({ texto, tarefaId, usuarioId }) =>
    formatar(
      await prisma.comentarios.create({
        data: {
          texto,
          tarefa_id: Number(tarefaId),
          usuario_id: Number(usuarioId),
        },
      }),
    ),
  remover: (id) =>
    registroOuNull(async () =>
      formatar(await prisma.comentarios.delete({ where: { id } })),
    ),
};
