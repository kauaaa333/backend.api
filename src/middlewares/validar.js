function validar(schema) {
  return function (req, res, next) {
    const erros = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    for (const campo in schema) {
      const regras = schema[campo];
      const valor = req.body ? req.body[campo] : undefined;
      const ausente = valor === undefined || valor === null || valor === '';

      // 1 — Campo obrigatório ausente
      if (regras.obrigatorio && ausente) {
        // No PUT/PATCH, se o campo não foi enviado (undefined), não bloqueia
        // Mas se foi enviado vazio (''), bloqueia
        if (!isUpdate || valor === '' || valor === null) {
          erros.push(`O campo '${campo}' é obrigatório`);
          continue;
        }
      }

      // Se ausente no PUT/PATCH ou campo opcional não enviado, pula demais checagens
      if (ausente) continue;

      // 2 — Tipo incorreto (só se o valor foi enviado)
      if (regras.tipo && typeof valor !== regras.tipo) {
        erros.push(`O campo '${campo}' deve ser do tipo ${regras.tipo}`);
        continue;
      }

      // 3 — Valor fora dos permitidos (enum)
      if (regras.enum && !regras.enum.includes(valor)) {
        erros.push(`O campo '${campo}' deve ser um de: ${regras.enum.join(', ')}`);
        continue;
      }

      // 4 — Formato de email
      if (regras.formato === 'email') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(valor)) {
          erros.push(`O campo '${campo}' deve ser um email válido`);
          continue;
        }
      }

      // 5 — Tamanho mínimo de texto
      if (regras.minLength && typeof valor === 'string' && valor.length < regras.minLength) {
        erros.push(`O campo '${campo}' deve ter ao menos ${regras.minLength} caracteres`);
        continue;
      }

      // 6 — Tamanho máximo de texto
      if (regras.maxLength && typeof valor === 'string' && valor.length > regras.maxLength) {
        erros.push(`O campo '${campo}' deve ter no máximo ${regras.maxLength} caracteres`);
        continue;
      }
    }

    if (erros.length > 0) {
      return res.status(400).json({ erros });
    }

    next();
  };
}

module.exports = validar;
