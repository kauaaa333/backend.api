# Validação — UC14 Dia 8 / Prisma II

Data: 29/10/2026 (America/Sao_Paulo).

## Escopo

Após a confirmação de que a migração para Prisma é requisito da atividade, foram migradas as gravações de tarefas, projetos e usuários. Para evitar deixar parte do CRUD da API no caminho antigo, os comentários e as consultas de autenticação também passaram a usar Prisma.

- Os models ativos não importam mais `sql.model.js` nem `config/database.js`.
- Tarefas usam `create`, `update`, `delete`, `findUnique`, `findMany` e `count` dentro da transação Prisma quando necessário.
- O resultado inclui `usuario`, `projeto` e `prioridade` planos, sem retirar IDs ou campos camelCase.
- Usuários usam seleção explícita para não devolver `senha_hash`; bcrypt e os parâmetros atuais foram mantidos.
- P2002 é traduzido para 409, P2003 para 400/409 e P2025 para 404; o model converte P2025 em null quando o controller já possui a mensagem específica.
- Exclusão com tarefas vinculadas retorna 409, e exclusão bem-sucedida continua 204, preservando o frontend.
- A collection Postman ganhou verificações de nomes na resposta, senha ausente e detalhe de conflito de e-mail.

Não foi aplicada migração de estrutura nem `db push`. Tabelas, constraints, triggers, índices e funções do Neon foram preservados. O padrão de prioridade continua Média ID 3, o projeto continua opcional e a atualização de tarefas continua parcial.

## Transação e auditoria

As gravações de tarefas usam transação interativa Prisma em Read Committed, com `maxWait` e `timeout` de 15 segundos. Os únicos comandos SQL diretos dos models ativos são controles específicos do PostgreSQL: `pg_advisory_xact_lock`, `SELECT ... FOR UPDATE` e `set_config` local. Eles ocorrem na mesma transação/conexão das operações Prisma. O limite de duas tarefas em andamento é contado novamente dentro do lock. Datas e histórico continuam nos triggers; datas fornecidas pelo cliente não entram na gravação.

Na versão 6.19.3, a violação de `ON DELETE RESTRICT` do Neon (SQLSTATE 23001) pode chegar como `PrismaClientUnknownRequestError`, sem `code` estruturado. O tradutor reconhece apenas a assinatura específica desse erro tipado, confirmada contra o banco real, retornando conflito sem expor a mensagem interna. Qualquer outro erro desconhecido continua sendo 500.

## Testes automatizados

| Verificação | Resultado |
| --- | --- |
| Backend `npm test` | 79 aprovados, 0 falhas |
| Frontend `npm test` | 9 aprovados, 0 falhas |
| Frontend lint e build | Aprovados |
| Prisma validate e generate | Aprovados, Client 6.19.3 |
| Carregamento do servidor | Nenhum módulo legado de SQL/pg carregado |

Os testes de integração executaram na branch Neon isolada já configurada. Foram preservadas as verificações de acesso por usuário, privilégios restritos, auditoria do ator, persistência após reiniciar a API, proteção de datas, comentários, exclusão em cascata e limite com cinco requisições concorrentes.

Testes novos exercitaram:

- CRUD de tarefas com IDs recebidos como texto, retorno completo de nomes e atualização parcial.
- Remoção do vínculo de projeto por `null` e consistência entre POST/PUT/GET.
- Cadastro/edição de usuário sem exposição de senha e preservação da autenticação.
- CRUD de projetos e comentários, conflito de e-mail/nome e exclusão bloqueada com 409.
- Erros P2002, P2003, P2025 e RESTRICT gerados realmente pelo banco, além de testes isolados do middleware e de erros desconhecidos.

A collection Postman foi atualizada; sua execução integral no Runner não faz parte desta rodada. A evidência automatizada é a suite Node e os testes HTTP/SQL indicados neste relatório.

## Navegador — ambiente local

- Login com Ana, usuária comum, na API local ligada à branch isolada.
- Criação pelo formulário: `Prisma II local 29-10-2026`.
- Edição para `Prisma II local editada 29-10-2026`, prioridade Alta.
- Movimentação de A Fazer para Em Andamento e Concluído.
- Recarregamento preservou texto, responsável, projeto, prioridade e coluna.
- SQL independente confirmou a tarefa temporária ID 28, usuário 1, projeto 1, prioridade 4, início `2026-10-29T10:56:44.816Z`, conclusão `2026-10-29T10:56:50.584Z` e três eventos de auditoria.
- Evidência: `tmp/validacao-uc14-dia8/quadro-local.png`.
- A tarefa temporária local foi removida pela API após conferência de ID, texto e responsável; resposta 204.

## Publicação e produção

- Backend publicado em produção: `dpl_8xjXbKhjyhD4kk2Y2C4RNf2VNpj7`, estado Ready, alias principal `https://backend-api-black-seven.vercel.app`.
- Os logs do build confirmaram a geração do Prisma Client 6.19.3. O pacote foi inspecionado: tradutor e helper de transação presentes, sem `.env` nem evidências temporárias.
- O frontend permanece no deployment `dpl_HkXKV2XXgJdhdbtg9Uk11PcPU3rQ`, Ready, alias `https://task-flow-gamma-inky.vercel.app`. Seu código não precisou ser alterado nem republicado nesta etapa; foi testado contra a nova API.
- Não foi feito commit nem push. As alterações locais preexistentes foram preservadas e o backend foi publicado diretamente no projeto já vinculado.

### Conferência de gravações na produção

- Login com a conta didática Alice: 200.
- Cadastro de usuário temporário ID 11: 201, sem senha/hash na resposta; login próprio: 200; edição: 200; duplicidade de e-mail: 409 com detalhe `email`; limpeza do próprio usuário: 204.
- Projeto temporário ID 6, dono Alice (10): criação 201 e edição de descrição 200.
- Tarefa temporária ID 14 criada pela interface, com responsável Alice, projeto 6 e prioridade Média.
- Edição pela tela para `Prisma II produção editada 29-10-2026`, prioridade Alta; nomes de usuário/projeto mantidos sem atualizar a página.
- Tentativa de excluir o projeto enquanto tinha tarefa: 409; projeto duplicado: 409.
- Comentário temporário ID 5: criação 201, listagem 200 e exclusão 204, tudo pela API migrada.
- Movimentação da tarefa pela interface de A Fazer para Em Andamento e Concluído, seguida de recarregamento para conferir persistência.
- SQL independente confirmou ID 14, usuário 10, projeto 6, prioridade 4, coluna `concluido`, início `2026-10-29T11:01:07.923Z`, conclusão `2026-10-29T11:01:20.042Z` e eventos INSERT/UPDATE/UPDATE com ator 10.
- Consultas `/tarefas`, `/estatisticas` e `/prioridades`: 200; ID fora da faixa: 400; ID inexistente e rota inexistente: 404. Respostas planas, sem hash ou relações internas expostas.

Após a captura das evidências, a limpeza pela API conferiu previamente o ID, o texto/nome e o proprietário dos registros temporários. Tarefa 14 e projeto 6: DELETE 204 e GET posterior 404. Usuário 11 e comentário 5 já haviam sido removidos nos seus testes. A exclusão pela interface não foi exercitada nesta rodada; sua evidência é o DELETE pela API e os testes automatizados.

SQL confirmou os quatro registros temporários ausentes. As contagens de produção ficaram iguais às iniciais: 8 usuários, 5 projetos e 11 tarefas. A auditoria passou de 24 para 28: INSERT, dois avanços de coluna e DELETE da tarefa temporária. Nenhum registro preexistente foi editado ou removido por esses testes.

### Evidências visuais

- `tmp/validacao-uc14-dia8/quadro-local.png`.
- `tmp/validacao-uc14-dia8/tarefa-concluida-producao.png`: tarefa de teste concluída e filtro Alta, antes da limpeza.
- `tmp/validacao-uc14-dia8/quadro-producao-final.png`: quadro após a limpeza.

Os servidores locais iniciados para a validação foram encerrados. As publicações da Vercel e o banco Neon continuam ativos.

## Ressalva de dependências

O `npm audit` de 29/10/2026 continua indicando três alertas altos na cadeia `deepmerge-ts`, `@prisma/config` e Prisma CLI 6.19.3. A correção automática propõe migrar para Prisma 7.10.1, uma mudança de versão principal que não foi aplicada nesta tarefa. A auditoria de segurança não está zerada. O alerta independente do body-parser já havia sido corrigido na etapa anterior.
