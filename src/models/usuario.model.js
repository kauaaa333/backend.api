const prisma = require('../database/prisma');
const formatar = require('../database/formatar');
const registroOuNull = require('../database/operacao');
const bcrypt = require('bcryptjs');
const versaoSenha = require('../utils/versaoSenha');
const select = {
  id: true,
  nome: true,
  email: true,
  administrador: true,
  criado_em: true,
  atualizado_em: true,
};
const buscar = async (id) =>
  formatar(await prisma.usuarios.findUnique({ where: { id }, select }));
module.exports = {
  listar: async () =>
    (await prisma.usuarios.findMany({ select, orderBy: { id: 'asc' } })).map(
      formatar,
    ),
  buscar,
  buscarPorId: buscar,
  async buscarParaSessao(id) {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { ...select, senha_hash: true } });
    if (!usuario) return null;
    const { senha_hash, ...publico } = usuario;
    return { ...formatar(publico), versaoSenha: versaoSenha(senha_hash) };
  },
  buscarPorEmail: async (email) =>
    formatar(
      await prisma.usuarios.findUnique({
        where: { email: email.trim().toLowerCase() },
        select,
      }),
    ),
  async autenticar(email, senha) {
    if (typeof email !== 'string' || typeof senha !== 'string') return null;
    const usuario = await prisma.usuarios.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, nome: true, email: true, senha_hash: true },
    });
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash)))
      return null;
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, versaoSenha: versaoSenha(usuario.senha_hash) };
  },
  async adicionar({ nome, email, senha }) {
    const senha_hash = await bcrypt.hash(senha, 12);
    return formatar(
      await prisma.usuarios.create({
        data: { nome, email: email.trim().toLowerCase(), senha_hash },
        select,
      }),
    );
  },
  async atualizar(id, { nome, email, senha }) {
    const data = {
      nome,
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
    };
    if (senha !== undefined) data.senha_hash = await bcrypt.hash(senha, 12);
    return registroOuNull(async () =>
      formatar(await prisma.usuarios.update({ where: { id }, data, select })),
    );
  },
  remover: (id) =>
    registroOuNull(async () =>
      formatar(await prisma.usuarios.delete({ where: { id }, select })),
    ),
};
