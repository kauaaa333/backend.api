# UC14 — Prisma I e II (Dias 7 e 8)

> Segurança atualizada em 29/10/2026: a dependência transitiva `deepmerge-ts` foi corrigida para 8.0.0 por override restrito a `@prisma/config`, mantendo o Prisma 6.19.3. Geração, validação, teste de ciclos e suite da API aprovados. `npm audit` da aplicação passou a zero alertas. A ressalva histórica abaixo descreve a situação anterior à correção.

Implementação baseada nos materiais `UC14_Dia7_Prisma_I.pdf` e `UC14_Dia8_Prisma_II.pdf`.

## Escopo aplicado

- Prisma CLI e Client 6.19.3, com versões alinhadas.
- `prisma/schema.prisma` obtido por introspecção das seis tabelas reais do Neon.
- Cliente único por processo em `src/database/prisma.js`, com limites de conexões e timeout.
- Prioridades: `findMany`, filtro `ativo = true`, ordenação por ID e seleção explícita.
- Tarefas: `findMany`/`findUnique` e `create`/`update`/`delete`, com nomes de projeto, responsável e prioridade; resultado plano, mantendo `usuarioId`, `projetoId` e datas em camelCase.
- Tarefas sem projeto ou responsável continuam representáveis, sem serem descartadas pela consulta.
- Projetos, usuários e comentários: consultas e gravações com Prisma. Autenticação também consulta o usuário pelo Prisma; bcrypt continua responsável pelo hash e pela comparação de senha.
- Usuários: seleção explícita dos campos públicos no cadastro, edição, exclusão e consultas; o hash só é consultado internamente na autenticação.
- Frontend: cartões preservados; POST/PUT passam a devolver nomes completos sem depender de um novo GET.
- Tradutor de erros Prisma: P2002 → 409, P2003 → 400 na gravação ou 409 na exclusão, P2025 → 404. Códigos desconhecidos continuam retornando 500 sem detalhes internos.
- Compatibilidade verificada com o Neon: o Prisma 6 envolve a violação `RESTRICT` (SQLSTATE 23001) em `PrismaClientUnknownRequestError`. Apenas essa assinatura específica e tipada recebe o mesmo tratamento de vínculo; outros erros desconhecidos continuam sendo 500.
- Exclusão de usuários/projetos com tarefas retorna 409. Exclusões bem-sucedidas continuam 204, mantendo o contrato atual.
- `postinstall` gera o cliente na instalação/publicação.
- IDs e FKs fora da faixa de INTEGER do PostgreSQL são rejeitados com 400 antes de chegar ao Prisma, evitando erro interno por overflow.
- `.vercelignore` exclui arquivos `.env`, evidências temporárias e testes do pacote de publicação; a configuração vem das variáveis da Vercel.

## Banco preservado

A migração agora abrange as leituras e as gravações dos models usados pela aplicação. As tarefas usam uma transação interativa Prisma (Read Committed, timeout e espera de 15 segundos). Dentro dela, os únicos comandos SQL diretos são controles específicos do PostgreSQL: advisory lock, lock da linha e `set_config` local para identificar o ator nos triggers. O CRUD e a contagem do limite usam métodos Prisma na mesma conexão/transação.

Os triggers continuam responsáveis pelas datas e pela auditoria; essas datas não são aceitas do cliente. Os arquivos antigos `src/models/sql.model.js` e `src/config/database.js` foram preservados como legado, sem importação pelos models ativos. A dependência `pg` continua disponível para fixtures e verificações SQL independentes dos testes, não para executar o CRUD da API.

Não foi executado `prisma migrate dev`, `prisma db push` ou mudança de estrutura. Os avisos da introspecção sobre CHECKs e índice de expressão não significam que foram removidos: continuam ativos no PostgreSQL. Não usar este schema para recriar o banco sem tratar esses recursos SQL.

## Configuração

Configurar por ambiente, sem incluir credenciais no Git:

- `DATABASE_URL`: URL pooled do Neon, com `connect_timeout=15`.
- `DIRECT_URL`: mesma branch/banco e credencial, hostname sem `-pooler`, para a introspecção.
- Manter as opções TLS da conexão e `JWT_SECRET`/`CORS_ORIGIN` já utilizados.
- Na Vercel, produção usa a branch principal; Preview usa a branch isolada de testes.

Comandos disponíveis:

```text
npm ci
npm run prisma:pull
npm run prisma:generate
npx prisma validate
npm test
```

`prisma:pull` lê a estrutura; não aplica alterações ao banco. Os testes de integração exigem `.env.test.local`, `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST` apontando para a branch descartável já configurada. A fixture bloqueia a limpeza se identificar a branch de produção.

## Ressalva de dependências

Na verificação de 26/10/2026, `npm audit` indicou três alertas altos encadeados na mesma causa: `deepmerge-ts`, `@prisma/config` e Prisma CLI 6.19.3. A correção automática proposta muda para Prisma 7, incompatível com a configuração ensinada nesta aula. Não foi aplicada atualização de versão principal nem override não validado. Esta entrega não declara auditoria de segurança zerada; conferir o relatório do Dia 8 para o resultado da verificação mais recente.

O alerta independente de `body-parser` foi corrigido para a versão 2.4.0, dentro da faixa compatível do Express. O backend foi testado novamente depois disso.
