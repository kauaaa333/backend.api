const criarErro = require('./criarErro');
const { Prisma } = require('@prisma/client');

module.exports = function traduzirErroPrisma(erro, metodo) {
  // Prisma 6 retorna RESTRICT (SQLSTATE 23001) sem code/meta estruturados.
  if (
    erro instanceof Prisma.PrismaClientUnknownRequestError &&
    /PostgresError\s*\{\s*code:\s*"23001"/.test(erro.message)
  ) {
    return metodo === 'DELETE'
      ? criarErro(
          409,
          'Não é possível excluir: existem registros ligados a este',
        )
      : criarErro(400, 'Um dos ids informados não existe');
  }
  if (erro.code === 'P2002') {
    // Não expor nomes internos de índices nem metadados do banco ao cliente.
    const alvo = erro.meta?.target;
    const campos = Array.isArray(alvo)
      ? alvo.filter((campo) => ['email', 'nome', 'descricao'].includes(campo))
      : alvo === 'projetos_nome_unico'
        ? ['nome']
        : [];
    return criarErro(
      409,
      'Já existe um registro com esse valor',
      campos.length ? [`Valor repetido em: ${campos.join(', ')}`] : undefined,
    );
  }
  if (erro.code === 'P2003') {
    return metodo === 'DELETE'
      ? criarErro(
          409,
          'Não é possível excluir: existem registros ligados a este',
        )
      : criarErro(400, 'Um dos ids informados não existe');
  }
  if (erro.code === 'P2025') return criarErro(404, 'Registro não encontrado');
  if (['P2000', 'P2004', 'P2011'].includes(erro.code))
    return criarErro(400, 'Dados inválidos para este registro');
  return erro;
};
