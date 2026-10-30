const { id, operacao: op } = require('./comum');
module.exports = {
  schemas: {
    LoginEntrada: { type: 'object', required: ['email', 'senha'], properties: {
      email: { type: 'string', format: 'email', example: 'pessoa@example.com' },
      senha: { type: 'string', format: 'password', writeOnly: true, description: 'Sua senha privada. Produção rejeita as senhas didáticas e senhas com menos de 12 caracteres ou mais de 72 bytes UTF-8.' },
    } },
    LoginResposta: { type: 'object', properties: { token: { type: 'string', description: 'JWT válido por 8 horas. Não compartilhar nem publicar.' },
      usuario: { type: 'object', properties: { id, nome: { type: 'string' } } },
    } },
    Perfil: { type: 'object', properties: { id, nome: { type: 'string' }, email: { type: 'string', format: 'email' } } },
  },
  paths: {
    '/auth/login': { post: op('Autenticação', 'Obtém um token JWT', 'LoginResposta', { body: 'LoginEntrada', security: [] }) },
    '/auth/perfil': { get: op('Autenticação', 'Consulta o próprio perfil', 'Perfil') },
  },
};
