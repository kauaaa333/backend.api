const prisma = require('../database/prisma');
const formatar = require('../database/formatar');
const registroOuNull = require('../database/operacao');
const buscar = async (id) =>
  formatar(await prisma.projetos.findUnique({ where: { id } }));
module.exports = {
  listar: async () =>
    (
      await prisma.projetos.findMany({
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      })
    ).map(formatar),
  buscar,
  buscarPorId: buscar,
  buscarPorNome: (nome) =>
    prisma.projetos.findFirst({
      where: { nome: { equals: nome.trim(), mode: 'insensitive' } },
      select: { id: true, nome: true },
    }),
  adicionar: async ({ nome, descricao, usuarioId }) =>
    formatar(
      await prisma.projetos.create({
        data: { nome: nome.trim(), descricao, usuario_id: Number(usuarioId) },
      }),
    ),
  atualizar: (id, { nome, descricao }) =>
    registroOuNull(async () =>
      formatar(
        await prisma.projetos.update({
          where: { id },
          data: {
            ...(nome !== undefined ? { nome: nome.trim() } : {}),
            descricao,
          },
        }),
      ),
    ),
  remover: (id) =>
    registroOuNull(async () =>
      formatar(await prisma.projetos.delete({ where: { id } })),
    ),
};
