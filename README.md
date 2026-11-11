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

### Execução de 09/11/2026

Versões testadas: backend `edea78a` e frontend `d6384b7`.

| Verificação | Resultado |
| --- | --- |
| Backend, incluindo integração com banco isolado | 89 testes aprovados |
| Frontend | 22 testes aprovados |
| Lint e build do frontend | Sem erros |
| Casos no navegador local | 7 aprovados e 1 bloqueado |

No navegador, foram conferidos o redirecionamento para login sem sessão, a entrada como visitante, a descrição vazia ou só com espaços, a criação de tarefa, a troca de projeto, a movimentação pelo controle “Mover para” e a exclusão. Criação, edição, movimentação e exclusão também foram conferidas após recarregar a página.

Esses casos rodaram no Chromium, com o frontend local e o modo visitante. Os dados ficaram no navegador; esse resultado não comprova gravação no Neon. O backend foi testado separadamente, com uma base isolada.

O CT-07, de login com senha incorreta no navegador, ficou bloqueado por falta de uma conta de teste disponível na execução. A aprovação foi de 87,5% dos oito casos planejados, abaixo dos 90% definidos na atividade. Ainda falta concluir esse caso e repetir o fluxo de tarefas com login no site publicado.

Não foram encontrados novos defeitos nos sete casos executados. A atividade foi feita no próprio TaskFlow, sem execução cruzada com outro colega. Esses números são o registro daquela execução, não uma garantia sobre versões posteriores.

Na primeira tentativa, suítes simultâneas interferiram nas fixtures da mesma base. A execução final, sem concorrência, passou nos 89 testes. Rode apenas uma suíte de integração por vez em cada banco de teste.

## Manutenção

Consulte [PRISMA.md](PRISMA.md), [NEON.md](NEON.md) e [RECUPERACAO.md](RECUPERACAO.md).

Para redefinir uma senha com entrada oculta:

```powershell
./scripts/definir-senha.ps1 -Email EMAIL_DA_CONTA
```

Trocar a senha invalida as sessões anteriores. Em produção, são exigidos ao menos 12 caracteres e no máximo 72 bytes.
