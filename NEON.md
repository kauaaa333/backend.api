# TaskFlow com Neon — fechamento UC13

O backend agora consulta PostgreSQL de verdade. Não existe fallback para arrays
ou criação automática de tabelas quando a aplicação inicia.

Os tokens agora incluem a versão neon-v1. Sessões emitidas pela versão em
memória serão recusadas: o usuário deve entrar novamente, porque os IDs antigos
podem representar outra pessoa no banco. JWT_SECRET não foi alterado.

## Correção de status e autorização — 13/10/2026

A migração 004 converte todo/doing/done para afazer/andamento/concluido.
Ela preserva IDs, textos, responsáveis, vínculos, datas e os eventos do histórico.
As datas não são recalculadas durante a conversão, que não representa movimento
real de tarefa. O banco agora rejeita os três nomes antigos.

Usuários comuns consultam e alteram somente suas tarefas, seus projetos e seu
próprio cadastro. As estatísticas e o ranking também são limitados ao usuário.
Não é permitido atribuir tarefas a outra pessoa ou vinculá-las a um projeto
alheio. Comentários respeitam o acesso à tarefa.

O campo usuarios.administrador é false por padrão. Nenhuma conta de produção
foi promovida. Se for necessário criar um administrador, o operador do banco
deve escolher explicitamente a conta, definir uma senha forte e então conceder
o perfil pelo banco. Body e claims do JWT não podem conceder esse perfil.
As permissões são consultadas no banco em cada requisição; tokens de contas
removidas deixam de funcionar.

Na auditoria, alterado_por identifica quem fez a operação na API e
responsavel_id identifica quem era o responsável pela tarefa.
origem=api indica contexto autenticado, banco indica operação SQL sem ator
da aplicação e legado identifica registros anteriores. Nos registros legados,
alterado_por foi preservado, mas não é prova de quem realizou a ação.

As cinco contas de demonstração com hashes fictícios não tiveram suas senhas
redefinidas. O operador pode usar scripts/definir-senha.js EMAIL, fornecendo
NOVA_SENHA apenas no ambiente do processo. O script usa bcrypt e não imprime
a senha. Não há recuperação pública de senha sem comprovação de identidade.

Consultas das aulas 6 e 7 adaptadas estão em sql/exercicios_uc13.sql.

## Backup e restauração

Antes desta correção foram criados a branch
backup-antes-correcao-status-20261013 e o snapshot
antes-status-e-seguranca-20261013 (snap-divine-rain-b6gg3y6y).
A restauração do snapshot foi testada em teste-restauracao-20261013,
sem sobrescrever produção: as 11 tarefas e os 16 eventos coincidiram com o
banco original, incluindo suas datas.

O projeto respondeu que a criação de agenda de snapshots não está habilitada.
Portanto NÃO há backup diário configurado. Para usar agendamento, habilite
essa capacidade na conta Neon, confira custos e então configure frequência
e retenção. Não foi feita alteração de plano nem criado agendamento externo.

Procedimento de recuperação: criar uma branch NOVA a partir do snapshot,
usando finalize:false no conector, comparar os dados e só depois decidir
qualquer substituição de produção. Não confiar apenas no nome solicitado:
conferir IDs, default e a associação dos computes antes e depois da chamada.
Nunca restaurar sobre production apenas para testar. As branches de teste e
recuperação foram mantidas; a remoção depende de decisão do usuário.

Durante o teste, a opção padrão de finalização do conector reassociou o compute
original à cópia restaurada. O estado foi corrigido: production e default
continuam apontando para br-solitary-silence-b6g83uqi, com os dados migrados.
O host atual é ep-rough-star-b636ftay.c-2.sa-east-1.aws.neon.tech.
DATABASE_URL da aplicação usa a variante -pooler; a conexão salva TaskFlow - Neon
do DBeaver foi atualizada para o host direto, sem alterar usuário ou senha.
O DBeaver pode precisar recarregar/reiniciar a conexão para usar essa alteração.

## Configuração

No arquivo local .env (ignorado pelo Git), configure DATABASE_URL com a conexão
do papel app_usuario e SSL sslmode=verify-full. Preserve JWT_SECRET e CORS_ORIGIN.
Na Vercel, configure a mesma variável para Production e faça um novo deploy.
Nunca publique a URL de conexão ou coloque senhas nos arquivos SQL.

O pool central fica em src/config/database.js; os models usam parâmetros $1, $2,
etc. A API mantém usuarioId, projetoId e idprioridade para continuar compatível
com o front-end. As datas são retornadas como instantes ISO em UTC.

## Alterações no banco

- 001_integracao_neon.sql: trigger de conclusão (inserção e mudança de coluna).
  Repetir concluido não altera a data; reabrir limpa concluida_em.
- 002_remover_tabelas_vendas.sql: remove somente as cinco tabelas autorizadas,
  usando RESTRICT. Não repetir sem conferir se ainda existem.
- 003_permissoes_aplicacao.sql: permissões específicas para a aplicação,
  sem poder alterar prioridades nem apagar o histórico.

Os triggers de início, atualização e auditoria existentes foram preservados.
O limite de duas tarefas em andamento é verificado na mesma transação da
escrita, com um lock compartilhado entre instâncias da API.
As proteções de exclusão de usuários/projetos com tarefas foram mantidas.

Contas antigas cadastradas com senha_hash fictício não têm senha válida.
O script scripts/importar-usuarios-demo.js migra apenas as três contas que
existiam nos arrays originais, usando bcrypt e sem sobrescrever contas no Neon.
São contas escolares de demonstração com senha 123456; troque a senha antes
de utilizar com dados reais.

## Comentários (rotas autenticadas)

- GET /tarefas/:id/comentarios
- POST /tarefas/:id/comentarios — JSON com texto; o autor vem do JWT.
- DELETE /comentarios/:id — somente o autor.

Excluir uma tarefa remove seus comentários por chave estrangeira CASCADE,
mas mantém a auditoria. O bonus dos slides foi implementado na API; não foi
adicionada uma interface de comentários ao front-end.

## Testes

Use uma branch Neon exclusiva para testes, nunca a branch principal.
Em .env.test.local (ignorado), defina TEST_DATABASE_URL com o papel proprietário,
TEST_DATABASE_EXPECTED_HOST com o host exato dessa branch e
TEST_APP_DATABASE_URL com app_usuario da mesma branch. Execute npm test.

A fixture limpa e recria os dados apenas nesse ambiente separado.
Os testes verificam CRUD, JWT, bcrypt, ausência de senhas nas respostas,
comentários, triggers, auditoria, persistência após reinício e concorrência.

## Recuperação

A branch backup-antes-integracao-20261013 foi criada antes das mudanças.
Ela conserva as tabelas removidas e os dados anteriores. A branch
teste-integracao-20261013 contém somente os testes e pode ser removida
depois da conferência, por decisão do usuário.
