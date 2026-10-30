# TaskFlow API

Backend do TaskFlow com Node.js, Express, Prisma e PostgreSQL.

[Aplicação](https://task-flow-gamma-inky.vercel.app/) · [Swagger](https://backend-api-black-seven.vercel.app/docs/) · [Frontend](https://github.com/kauaaa333/TaskFlow)

## Executar

Requer Node.js 22 e PostgreSQL.

```sh
npm ci
npm run dev
```

Configure em `.env`:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL; endereço pooled no Neon |
| `DIRECT_URL` | Conexão direta com o mesmo banco |
| `JWT_SECRET` | Chave aleatória para assinar tokens |
| `CORS_ORIGIN` | Endereço do frontend |
| `PORT` ou `PORTA` | Porta da API; padrão 3000 |
| `TASKFLOW_PRODUCTION_SECURITY` | Use `true` em produção |

Use um banco separado para desenvolvimento. Não versione senhas, tokens, arquivos `.env` ou backups.

## API

Recursos: autenticação, tarefas, projetos, usuários, prioridades, comentários e estatísticas.

Usuários comuns acessam seus próprios registros. Administradores podem gerenciar os registros dos demais usuários. O perfil é consultado no banco em cada requisição.

A criação de contas exige autenticação e não concede administração. Administradores são provisionados pelo operador do sistema.

Consulte `/docs/` para os parâmetros e respostas. As rotas protegidas recebem `Authorization: Bearer TOKEN`; no botão **Authorize**, informe somente o token. O Swagger executa requisições reais: POST, PUT e DELETE podem alterar o banco.

## Estrutura

- `src/routes`: rotas HTTP.
- `src/controllers`: requisições e regras de acesso.
- `src/models`: consultas e gravações.
- `src/middlewares`: autenticação, validação e erros.
- `src/docs`: OpenAPI.
- `prisma/schema.prisma`: mapeamento do banco.
- `test`: testes e preparação do banco isolado.

## Testes

```sh
npm test
npm run test:uc14
npm audit
```

Os testes de integração exigem `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST` em `.env.test.local`. As fixtures limpam essa base; use um ambiente descartável.

O GitHub Actions usa PostgreSQL temporário. A coleção Postman está em `postman/`. O runner `scripts/run-postman.cjs` usa Newman instalado separadamente em `tmp/postman-runner`:

```sh
npm install --prefix=tmp/postman-runner --no-save --package-lock=false newman@6.2.3
node scripts/run-postman.cjs
```

## Manutenção

Consulte [PRISMA.md](PRISMA.md), [NEON.md](NEON.md) e [RECUPERACAO.md](RECUPERACAO.md).

Para redefinir uma senha com entrada oculta:

```powershell
./scripts/definir-senha.ps1 -Email EMAIL_DA_CONTA
```

Trocar a senha invalida as sessões anteriores. Em produção, são exigidos ao menos 12 caracteres e no máximo 72 bytes.
