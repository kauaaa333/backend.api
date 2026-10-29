# TaskFlow API

API Express 5 com Prisma 6 e PostgreSQL/Neon. Frontend: https://task-flow-gamma-inky.vercel.app. API: https://backend-api-black-seven.vercel.app.

## Configuração local

Instale com `npm ci`. Configure `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` e `CORS_ORIGIN` em `.env` (nunca no Git). Use uma branch de desenvolvimento, não o banco de produção. Inicie com `npm run dev`.

- `DATABASE_URL`: conexão pooled da branch escolhida, com TLS verificado.
- `DIRECT_URL`: conexão direta da mesma branch para introspecção.
- `JWT_SECRET`: valor aleatório forte, no mínimo 32 caracteres em produção.
- `TASKFLOW_PRODUCTION_SECURITY=true`: obrigatório na produção; exige senhas de pelo menos 12 caracteres e até 72 bytes. As credenciais didáticas não são aceitas.

O schema já existe. Não executar `db push`, `migrate reset` ou scripts de teste no banco real. `npm run prisma:generate` apenas gera o cliente; `npm run prisma:pull` lê a estrutura.

## Segurança e acesso

A tela de login não publica credenciais. Contas existentes e seus dados foram preservados. O administrador de produção é provisionado explicitamente por um operador com acesso ao banco; não há promoção de permissões pelo body ou pelo JWT.

`scripts/provisionar-admin.cjs` cria somente uma conta nova, após confirmação do host em `.env.admin.local`. Esse arquivo contém a senha inicial e é ignorado pelo Git/Vercel. Não compartilhe o arquivo, não faça screenshots dele e não coloque a senha em issues ou logs.

Para redefinir uma senha sem exibi-la no terminal:

```powershell
./scripts/definir-senha.ps1 -Email EMAIL_DA_CONTA
```

A troca invalida sessões antigas pela versão da senha verificada no banco. Uma rotação de `JWT_SECRET` invalida todas as sessões. Cookies/token não concedem o perfil de administrador: ele é consultado no banco em cada requisição.

## Validação

```text
node scripts/check-secrets.cjs
npm audit --audit-level=high
npm test
```

Os testes de integração exigem `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST` em `.env.test.local`, apontando à mesma branch isolada descartável. A fixture limpa SOMENTE esse destino, após conferir o host e rejeitar o host da aplicação. A política de senhas de demonstração é permitida somente nos testes.

O GitHub Actions prepara PostgreSQL efêmero próprio, inclui constraints/triggers/funções necessários e roda a suite completa sem credenciais ou dados do Neon. Mudanças em `main` e pull requests acionam o workflow.

O verificador de segredos bloqueia padrões conhecidos e arquivos `.env` candidatos ao Git; não substitui revisão nem detecção especializada de segredos.

## Postman / Newman

A coleção e os ambientes estão em `postman/`, sem credenciais. Para execução local reproduzível, o Newman oficial é instalado como ferramenta temporária, fora das dependências publicadas da API:

```text
npm install --prefix=tmp/postman-runner --no-save --package-lock=false newman@6.2.3
node scripts/run-postman.cjs
```

O Newman 6 utiliza bibliotecas legadas; é ferramenta de validação de uma coleção confiável, não dependência da aplicação. `tmp/` não vai ao Git nem à Vercel. Relatórios sanitizados guardam apenas contagens e nomes das verificações, sem requests, senhas ou tokens.

Por padrão, o runner usa a API local da porta 3002. Para produção, exige autorização explícita `TASKFLOW_POSTMAN_ALLOW_PRODUCTION=true`, o endereço principal em `TASKFLOW_POSTMAN_BASE_URL` e as credenciais privadas de operador em `.env.admin.local`. A coleção cria e exclui registros temporários; deve ser executada inteira e os resíduos devem ser conferidos ao final.

## Recuperação

Consulte [RECUPERACAO.md](RECUPERACAO.md), [PRISMA.md](PRISMA.md) e os relatórios de validação. Backups e chaves nunca são versionados. `NEON.md` e os relatórios anteriores registram etapas históricas; o estado mais recente está em `VALIDACAO_FINAL.md`.
