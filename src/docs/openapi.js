const comum = require('./comum');
const recursos = ['auth', 'tarefas', 'projetos', 'usuarios', 'prioridades', 'comentarios'].map(nome => require(`./${nome}.docs`));
function juntar(campo) {
  const resultado = {};
  for (const recurso of [comum, ...recursos]) for (const [nome, valor] of Object.entries(recurso[campo] || {})) {
    if (Object.hasOwn(resultado, nome)) throw new Error(`Documentação duplicada: ${campo}.${nome}`);
    resultado[nome] = valor;
  }
  return resultado;
}
module.exports = {
  openapi: '3.0.3',
  info: { title: 'TaskFlow API', version: '1.0.0', description: 'API TaskFlow — Prisma e PostgreSQL. Documentação pública; operações protegidas por JWT. Use Authorize com somente o token, sem Bearer. Try it out executa operações reais: POST/PUT/DELETE alteram o banco do servidor selecionado. Não use dados reais em exemplos e não compartilhe tokens. Administradores acessam todos os registros; usuários comuns acessam seus registros, conforme as regras de cada rota.' },
  servers: [{ url: '/', description: 'Este servidor (local ou produção)' }],
  security: [{ bearerAuth: [] }],
  paths: juntar('paths'),
  components: { schemas: juntar('schemas'), securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
};
