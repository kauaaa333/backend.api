const prisma = require("../database/prisma");
const select = { id: true, descricao: true, ativo: true };
module.exports = {
  listar: () =>
    prisma.prioridades.findMany({
      where: { ativo: true },
      orderBy: { id: "asc" },
      select,
    }),
  listarTodas: () =>
    prisma.prioridades.findMany({ orderBy: { id: "asc" }, select }),
  buscar: (id) => prisma.prioridades.findUnique({ where: { id }, select }),
  ID_PADRAO: 3,
};
