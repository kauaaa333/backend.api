const { id, data, parametroId, lista, operacao: op } = require('./comum');
const propriedades = { nome: { type: 'string', minLength: 3, maxLength: 100, example: 'Pessoa exemplo' }, email: { type: 'string', format: 'email', maxLength: 150, example: 'pessoa@example.com' } };
const entrada = { type: 'object', properties: { ...propriedades,
  senha: { type: 'string', format: 'password', writeOnly: true, minLength: 12, description: 'Produção: mínimo de 12 caracteres, máximo de 72 bytes UTF-8. Somente em teste/desenvolvimento o mínimo é 6.' },
} };
module.exports = {
  schemas: {
    Usuario: { type: 'object', properties: { id, ...propriedades, administrador: { type: 'boolean', readOnly: true }, criadoEm: data, atualizadoEm: data } },
    UsuarioEntrada: { ...entrada, required: ['nome', 'email', 'senha'], description: 'Cria sempre usuário comum. Requer token; não é cadastro público anônimo.' },
    UsuarioAtualizacao: { ...entrada, required: ['nome', 'email'], description: 'O controller exige nome e email também no PUT. Senha é opcional e sua troca revoga sessões anteriores.' },
  },
  paths: {
    '/usuarios': {
      get: op('Usuários', 'Lista todos para administrador; somente o próprio para conta comum', lista('Usuario')),
      post: op('Usuários', 'Cria uma conta comum (requer autenticação)', 'Usuario', { body: 'UsuarioEntrada', status: 201 }),
    },
    '/usuarios/{id}': {
      get: op('Usuários', 'Consulta usuário acessível', 'Usuario', { parameters: [parametroId] }),
      put: op('Usuários', 'Atualiza usuário acessível, sem alterar permissões', 'Usuario', { parameters: [parametroId], body: 'UsuarioAtualizacao' }),
      delete: op('Usuários', 'Exclui usuário sem vínculos impeditivos', null, { status: 204, parameters: [parametroId] }),
    },
  },
};
