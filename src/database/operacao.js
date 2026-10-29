// update/delete do Prisma lançam P2025 quando o registro não existe mais.
// O controller conserva a mensagem 404 específica da entidade.
module.exports = async function registroOuNull(operacao) {
  try {
    return await operacao();
  } catch (erro) {
    if (erro.code === 'P2025') return null;
    throw erro;
  }
};
