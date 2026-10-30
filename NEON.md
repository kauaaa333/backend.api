# PostgreSQL no Neon

O backend usa PostgreSQL por meio do Prisma. Não há armazenamento em memória como alternativa ao banco.

## Conexões

Configure `DATABASE_URL` com o endereço pooled e `DIRECT_URL` com o endereço direto da mesma branch. Mantenha a verificação TLS habilitada.

Em produção, use a credencial restrita da aplicação. Não exponha a conexão em arquivos SQL, logs ou documentação pública. As variáveis de produção ficam na Vercel; arquivos locais `.env` são ignorados pelo Git.

## Regras do banco

- Colunas das tarefas: `afazer`, `andamento` e `concluido`.
- Triggers controlam início, conclusão, atualização e auditoria.
- Excluir uma tarefa remove seus comentários, mas mantém o histórico.
- Projetos e usuários com tarefas vinculadas não podem ser excluídos.
- A transação da API limita a duas tarefas em andamento por responsável.

Na auditoria, `alterado_por` identifica o ator autenticado e `responsavel_id` identifica o responsável pela tarefa. A origem distingue operações da API, do banco e registros legados.

## Testes e recuperação

Use uma branch descartável para testes. Configure `TEST_DATABASE_URL`, `TEST_APP_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST`; as fixtures limpam apenas esse destino após validar o host.

Os scripts em `sql/` registram alterações anteriores. Não execute novamente sem revisar o estado do banco.

Para backup e recuperação, consulte [RECUPERACAO.md](RECUPERACAO.md). O agendamento de backups externos ainda precisa ser configurado.
