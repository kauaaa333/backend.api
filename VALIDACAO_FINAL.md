# Validação e preparação para uso real — 29/10/2026

## Evidências locais concluídas

- Backend: 82 testes aprovados, incluindo persistência no PostgreSQL isolado, Prisma, permissões, transações e invalidação de sessão após troca de senha.
- Frontend: 10 testes aprovados, lint e build aprovados.
- Auditoria das dependências da aplicação: zero vulnerabilidades conhecidas no backend e no frontend na execução desta data. Isso não equivale a uma auditoria completa de segurança.
- Coleção Postman/Newman local: 37 requisições, 68 verificações, nenhuma falha. O executor Newman fica isolado em `tmp/`, fora das dependências e do deploy da aplicação.
- Interface local conectada ao banco de teste: criada uma tarefa descartável, confirmada sua exclusão pelo botão X, recarregada a tela e conferida ausência no banco. Exclusão autorizada pelo usuário; nenhum registro de produção envolvido.
- Backup dos seis conjuntos de dados criptografado com AES-256-GCM; restauração executada somente no banco isolado, com conferência integral do conteúdo (hash SHA-256 idêntico). Contagens da cópia: 9 usuários, 5 prioridades, 5 projetos, 11 tarefas, 4 comentários e 28 eventos de auditoria.

## Proteções implementadas

- Credenciais didáticas removidas da tela de login; produção rejeita senhas fracas e exige ao menos 12 caracteres para novas senhas.
- Conta administradora própria provisionada sem modificar os oito usuários anteriores; segredo inicial somente em arquivo local ignorado pelo Git e pela Vercel.
- Nova chave de sessão configurada para produção. Sua publicação encerra as sessões antigas.
- Alterar a senha invalida sessões anteriores; dados públicos de usuário não incluem hash ou versão interna da senha.
- Verificação de segredos e validação automatizada nos dois repositórios. Backend usa PostgreSQL efêmero no CI, sem acesso ao Neon de produção.

## Publicação e verificação remota

- Backend enviado à `main`: implementação `59ff393`, repositório https://github.com/kauaaa333/backend.api. CI aprovado: https://github.com/kauaaa333/backend.api/actions/runs/40866906953 (inclui os testes contra PostgreSQL efêmero).
- Frontend enviado à `main`: `1d5c4c1`, repositório canônico https://github.com/kauaaa333/TaskFlow. CI aprovado: https://github.com/kauaaa333/TaskFlow/actions/runs/40866913408 (testes, lint, build, auditoria e verificação de segredos).
- Backend publicado automaticamente pelo Git na Vercel: deployment `dpl_GHEjP6PNwDgS4oHE5Cc2LVPk51HM`, estado READY e alias https://backend-api-black-seven.vercel.app.
- Frontend publicado a partir dos arquivos do commit acima: deployment `dpl_HFiQzQjFAwePw32SBAygz1AWDKa2`, estado READY e alias https://task-flow-gamma-inky.vercel.app. O envio ao GitHub não iniciou uma publicação automática desse projeto; a publicação foi feita pela conexão Vercel existente, sem credenciais no código.
- Postman/Newman em produção: 37 requisições e 68 verificações, zero falhas. Os registros temporários foram removidos pela coleção. Consulta independente após execução: 9 usuários, 5 projetos, 11 tarefas, 4 comentários, 31 eventos de auditoria (antes: 28).
- Login da conta administradora: HTTP 200; tentativa com senha didática: HTTP 401. A sessão antiga do navegador foi invalidada pela rotação da chave, conforme esperado.
- Navegador no endereço principal: login do novo administrador, leitura das 11 tarefas, filtro Urgente e retorno a Todas, abertura da confirmação de exclusão e cancelamento sem apagar tarefa de produção. Senha pública não aparece mais na tela de login. O erro 401 observado antes do novo login corresponde à sessão antiga revogada, não ao fluxo autenticado atual.

Relatórios sanitizados e capturas de tela ficam em `tmp/validacao-final/`, ignorados pelo Git. Não publicar dumps completos do executor: eles podem incluir credenciais e tokens.

## Limites operacionais

O banco de produção não recebeu limpeza, `db push` ou migração destrutiva. As contas e os dados anteriores foram preservados. As antigas credenciais didáticas não devem ser usadas em produção; a renovação das senhas das demais pessoas exige um procedimento individual.

O backup local e a restauração foram testados, mas ainda é necessário definir responsável, armazenamento privado fora desta máquina, periodicidade e retenção. Esses serviços não foram contratados ou automatizados. Consultar `RECUPERACAO.md` antes de armazenar dados críticos.
