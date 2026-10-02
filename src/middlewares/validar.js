function validar(schema) {
  return function (req, res, next) {
    const erros = [];
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    for (const campo in schema) {
      const regras = schema[campo];
      const valor = req.body ? req.body[campo] : undefined;
      const ausente = valor === undefined || valor === null || valor === '';

      
      if (regras.obrigatorio && ausente) {
        if (!isUpdate || valor === '' || valor === null) {
          erros.push(`O campo '${campo}' é obrigatório`);
          continue;
        }
      }


      if (ausente) continue;

      if (regras.tipo && typeof valor !== regras.tipo) {
        erros.push(`O campo '${campo}' deve ser do tipo ${regras.tipo}`);
        continue;
      }

      if (regras.enum && !regras.enum.includes(valor)) {
        erros.push(`O campo '${campo}' deve ser um de: ${regras.enum.join(', ')}`);
        continue;
      }

      if (regras.formato === 'email') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(valor)) {
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
      return res.status(400).json({ erros });
    }

    next();
  };
}

module.exports = validar;
