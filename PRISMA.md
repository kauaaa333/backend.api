# Acesso ao banco com Prisma

A aplicação usa Prisma 6.19.3 nas leituras e gravações. O schema mapeia as seis tabelas do PostgreSQL: usuários, projetos, tarefas, prioridades, comentários e auditoria.

O cliente fica em `src/database/prisma.js`, com uma instância por processo. Os models retornam os campos da API em camelCase; o mapeamento está em `src/database/formatar.js`.

## Configuração

- `DATABASE_URL`: conexão pooled.
- `DIRECT_URL`: conexão direta com a mesma branch.

```sh
npm run prisma:pull
npm run prisma:generate
npx prisma validate
```

A introspecção lê a estrutura existente. O cliente também é gerado pelo `postinstall`.

## Transações e regras

As gravações de tarefas usam uma transação com locks do PostgreSQL. A contagem do limite de duas tarefas em andamento e a gravação acontecem na mesma transação. O ator da operação é definido com `set_config`, para uso pela auditoria.

Triggers controlam as datas e o histórico. CHECKs e o índice de expressão do banco não são inteiramente representados no schema Prisma. Não use `db push` ou `migrate reset` em produção para recriar essa estrutura.

A tradução dos erros fica em `src/utils/traduzirErroPrisma.js`: conflitos retornam 409, referências inválidas retornam 400 e registros ausentes retornam 404. Falhas inesperadas não expõem detalhes internos.

O override de `deepmerge-ts` em `@prisma/config` mantém a correção da dependência sem trocar a versão principal do Prisma.
