const criarErro = require('../utils/criarErro');
const { producao, senhaAceita } = require('../utils/politicaSenha');

function validar(schema, origem = 'body') {
  return function (req, res, next) {
    const dados = req[origem] || {};
    const erros = [];
    const atualizacao = origem === 'body' && (req.method === 'PUT' || req.method === 'PATCH');
    if (typeof dados !== 'object' || Array.isArray(dados)) {
      throw criarErro(400, 'Dados inválidos', ['Envie um objeto JSON']);
    }
    if (atualizacao && !Object.keys(schema).some((campo) => dados[campo] !== undefined)) {
      throw criarErro(400, 'Dados inválidos', ['Envie ao menos um campo para atualizar']);
    }

    for (const campo in schema) {
      const regras = schema[campo];
      const valor = dados[campo];
      const ausente = valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim());

      if (regras.obrigatorio && ausente) {
        if (!atualizacao || valor !== undefined) {
          erros.push(`O campo '${campo}' é obrigatório`);
          continue;
        }
      }

      if (ausente) continue;

      if (campo === 'senha' && producao() && !senhaAceita(valor)) {
        erros.push('A senha deve ter ao menos 12 caracteres e no máximo 72 bytes, sem usar senhas públicas de demonstração');
        continue;
      }

      if (regras.tipo === 'inteiro') {
        const numero = typeof valor === 'string' ? Number(valor) : valor;
        // As chaves introspectadas são INTEGER de 32 bits no PostgreSQL.
        if (!Number.isSafeInteger(numero) || numero <= 0 || numero > 2147483647) {
          erros.push(`O campo '${campo}' deve ser um inteiro positivo até 2147483647`);
          continue;
        }
        // req.query é um getter no Express 5; só normalizamos o body.
        if (origem === 'body') dados[campo] = numero;
      } else if (regras.tipo && typeof valor !== regras.tipo) {
        erros.push(`O campo '${campo}' deve ser do tipo ${regras.tipo}`);
        continue;
      }

      if (regras.enum && !regras.enum.includes(valor)) {
        erros.push(`O campo '${campo}' deve ser um de: ${regras.enum.join(', ')}`);
        continue;
      }

      if (regras.inteiro && (!Number.isSafeInteger(valor) || valor < -2147483648 || valor > 2147483647)) {
        erros.push(`O campo '${campo}' deve ser inteiro`);
        continue;
      }
      if (regras.minimo !== undefined && valor < regras.minimo) {
        erros.push(`O campo '${campo}' deve ser ao menos ${regras.minimo}`);
        continue;
      }

      if (regras.formato === 'email') {
        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formatoEmail.test(valor)) {
          erros.push(`O campo '${campo}' deve ser um email válido`);
          continue;
        }
      }

      if (regras.minLength && typeof valor === 'string' && valor.length < regras.minLength) {
        erros.push(`O campo '${campo}' deve ter ao menos ${regras.minLength} caracteres`);
        continue;
      }

      if (regras.maxLength && typeof valor === 'string' && valor.length > regras.maxLength) {
        erros.push(`O campo '${campo}' deve ter no máximo ${regras.maxLength} caracteres`);
        continue;
      }
    }

    if (erros.length > 0) {
      throw criarErro(400, 'Dados inválidos', erros);
    }

    next();
  };
}

module.exports = validar;
