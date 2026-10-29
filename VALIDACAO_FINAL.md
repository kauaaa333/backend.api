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

O envio ao GitHub, os resultados do CI e as verificações da nova publicação em produção serão registrados nesta seção após sua execução. Não considerar etapas pendentes como aprovadas.

## Limites operacionais

O banco de produção não recebeu limpeza, `db push` ou migração destrutiva. As contas e os dados anteriores foram preservados. As antigas credenciais didáticas não devem ser usadas em produção; a renovação das senhas das demais pessoas exige um procedimento individual.

O backup local e a restauração foram testados, mas ainda é necessário definir responsável, armazenamento privado fora desta máquina, periodicidade e retenção. Esses serviços não foram contratados ou automatizados. Consultar `RECUPERACAO.md` antes de armazenar dados críticos.
