# TaskFlow API

[![Backend - validação](https://github.com/kauaaa333/backend.api/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kauaaa333/backend.api/actions/workflows/ci.yml)

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
npm run test:unit
npm run test:integracao
npm run test:watch
npm run test:uc14
npm audit
```

Os testes de integração exigem `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST` em `.env.test.local`. As fixtures limpam essa base; use um ambiente descartável.

O GitHub Actions usa PostgreSQL temporário. A coleção Postman está em `postman/`. O runner `scripts/run-postman.cjs` usa Newman instalado separadamente em `tmp/postman-runner`:

```sh
npm install --prefix=tmp/postman-runner --no-save --package-lock=false newman@6.2.3
node scripts/run-postman.cjs
```

### Jest — Dia 3

Os testes unitários da aula estão em `tests/`:

- `criarErro.test.js`: status, mensagem e detalhes opcionais.
- `traduzirErroPrisma.test.js`: P2002, P2003, P2025 e erro não tratado.
- `exercicio.test.js`: os quatro casos extras do slide.

`npm run test:unit` executa os testes Jest sem banco. `npm test` roda essa etapa, os testes Supertest com banco isolado e, por último, os testes anteriores com `node:test`. Para executar somente a suíte anterior, use `npm run test:regressao`. O GitHub Actions continua usando `npm test`, portanto também executa os novos testes.

Para acompanhar alterações, use `npm run test:watch`. Para rodar um arquivo específico:

```sh
npx jest tests/criarErro.test.js --runInBand
```

No exercício de falha proposital, o esperado foi trocado de 404 para 400. O Jest apontou a diferença e retornou erro. Depois de restaurar 404, os 12 testes passaram. As funções da API não precisaram ser alteradas.

Validação em 12/11/2026: 12 testes Jest e 89 testes da suíte anterior aprovados. A integração usou banco isolado, sem alterar produção. A auditoria das dependências de produção não encontrou vulnerabilidades; a árvore de desenvolvimento tem alertas baixos e moderados. Não foi aplicado o downgrade incompatível sugerido por `npm audit fix --force`.

### Dias 4 a 6 — middlewares, rotas e banco isolado

- `tests/formatarTarefa.test.js`: relações, campos públicos, relações ausentes e preservação do registro original.
- `tests/validar.test.js` e `tests/exercicio-dia4.test.js`: validação do body e dos parâmetros com `jest.fn`.
- `tests/tratarErros.test.js`: status, detalhes e ocultação de erros internos, usando `mockReturnThis` e `spyOn`.
- `tests/rotas.test.js`: Supertest com JWT real, sem banco. Somente a busca do usuário da sessão é simulada; consultas de persistência são bloqueadas.
- `tests/integracao/rotas-banco.test.js`: login real, listas, criação, leitura, exclusão e confirmação direta pelo Prisma.
- `tests/isolamentoBanco.test.js`: trava contra produção, host não confirmado e URLs divergentes.

`app.js` monta a API; `server.js` abre a porta somente quando executado diretamente. O export antigo foi mantido para compatibilidade. Importar o servidor em um teste não liga a API.

Para a integração, mantivemos `.env.test.local`, já usado pela suíte anterior, em vez de criar outro arquivo de segredos. Configure `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST`. As duas URLs devem apontar para o mesmo banco isolado; podem usar usuários distintos e endpoint direto ou pooled. O endereço da aplicação em `.env` é usado como referência para impedir testes no mesmo endpoint.

`tests/integracao/setup-banco.js` verifica essa configuração antes de importar a API. As fixtures conferem todas as URLs antes de limpar tabelas. Não execute integração em banco que precise preservar dados. Sem configuração válida, a execução para; não há fallback para produção.

As suítes sem banco usam uma URL local inativa, impedindo que o dotenv carregue a conexão real. A integração usa `--runInBand`, cria dados conhecidos e fecha Prisma e pool ao terminar. Cada tarefa criada pelo Supertest é removida mesmo se uma verificação falhar; o total de tarefas precisa voltar ao valor inicial.

Os exemplos dos slides foram adaptados ao contrato atual: campos camelCase (`usuarioId`, `projetoId`), texto como único campo obrigatório da tarefa, exclusão com status 204 e autenticação que consulta o usuário no banco. Nenhuma regra de produção foi relaxada para fazer os testes passarem.

Os testes Jest sem banco continuam disponíveis sem credenciais:

```sh
npm run test:unit
```

Para os testes HTTP com banco isolado:

```sh
npm run test:integracao
```

Auditoria em 18/11/2026: `npm audit --omit=dev` não apontou vulnerabilidades. A árvore de desenvolvimento apresentou 41 alertas (37 altos e 4 moderados), ligados às dependências transitivas de Jest e nodemon. `npm audit fix` foi executado, mas não eliminou os alertas.

O CI separa as duas verificações. A auditoria de produção continua obrigatória e bloqueia vulnerabilidades altas ou críticas. A auditoria completa também roda, mas os alertas das ferramentas de desenvolvimento ficam como aviso e não impedem os testes. Essa política foi adotada enquanto o picomatch não tem uma versão corrigida publicada; não significa que a vulnerabilidade foi resolvida. Os detalhes continuam disponíveis no log do Actions.

Validação dos Dias 4 a 6 em 18/11/2026: 49 testes sem banco, 7 testes Supertest com banco isolado e 89 testes da suíte anterior aprovados. Total: 145. As tarefas criadas pela integração foram removidas e o total de registros voltou ao valor inicial. Nenhum teste desta execução foi direcionado à API ou ao banco de produção.

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
