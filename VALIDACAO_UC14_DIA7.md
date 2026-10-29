# Validação UC14 — Dia 7 / Prisma I

Data da conclusão: 26/10/2026 (America/Sao_Paulo).

Material: `C:\Users\alunoctg.FIERN\Downloads\UC14_Dia7_Prisma_I.pdf` — 33 páginas. O material foi comparado com a implementação existente; seus exemplos foram adaptados ao contrato e às permissões reais do TaskFlow. Orientações do PDF não foram tratadas como autorização para apagar dados, criar migrações ou fazer push.

## Resultado dos testes

| Verificação | Resultado |
| --- | --- |
| Introspecção do Neon | 6 tabelas reconhecidas, sem alterar estrutura |
| `prisma generate` e `prisma validate` | Aprovados com Prisma 6.19.3 |
| Backend — `npm test` | 63 testes aprovados; 0 falhas |
| Frontend — `npm test` | 9 testes aprovados; 0 falhas |
| Frontend — `npm run lint` | Aprovado |
| Frontend — `npm run build` | Aprovado |
| `git diff --check`, nos dois projetos | Sem erros de whitespace; somente avisos locais de LF/CRLF |

O backend usa uma branch Neon isolada nos testes. A suite cobre autenticação, acesso por usuário, persistência após reiniciar a API, comentários, FKs, auditoria e limite de andamento com requisições concorrentes. O teste do Dia 7 acrescenta leitura das relações pelo Prisma, nomes planos, preservação dos campos usados pelo frontend, tarefas sem projeto, ordenação, ausência de senha e respostas 400/404. Testes de overflow de INTEGER foram adicionados após reproduzir o erro 500 e aplicar a correção.

## Validação visual com banco isolado

- Login como usuária comum Ana e listagem apenas das suas tarefas.
- Criação pelo formulário: tarefa temporária ID 26, responsável Ana (1), projeto TaskFlow MVP (1), prioridade média (3).
- Consulta SQL independente confirmou a gravação.
- Edição pela tela para `Validação Prisma Dia 7 - edição validada 26-10-2026`, prioridade alta (4).
- Após recarregar, texto, prioridade, responsável e projeto continuaram corretos.
- Movimentação pela tela de A Fazer para Em Andamento e Concluído.
- SQL confirmou `coluna = concluido`, datas de início/conclusão e três eventos de auditoria.
- O registro temporário foi eliminado pela preparação da rodada posterior da suite, na branch isolada. Nenhum registro de produção foi afetado por essa preparação.

## Publicações em produção

Backend:

- Endereço principal: https://backend-api-black-seven.vercel.app
- Deployment final: `dpl_7EUyN1Ff5HLCTNvbpcAKU5c8j4at`.
- Estado confirmado: Ready, endereço principal associado.
- Logs confirmaram `Generated Prisma Client (v6.19.3)` durante o `postinstall`.
- Pacote final inspecionado: schema Prisma presente; arquivos `.env` e evidências de `tmp` ausentes, com exclusões explícitas em `.vercelignore`.

Frontend:

- Endereço principal: https://task-flow-gamma-inky.vercel.app
- Deployment: `dpl_HkXKV2XXgJdhdbtg9Uk11PcPU3rQ`.
- Estado confirmado: Ready, endereço principal associado.
- Publicado a partir dos arquivos locais selecionados, sem arquivos `.env`.

Não foi feito commit nem push: as alterações preexistentes dos dois repositórios foram preservadas. A publicação foi direta nos projetos existentes, seguindo a autorização para atualizar o endereço principal.

## Conferência da API publicada

- Login: 200.
- `/tarefas`, `/projetos`, `/prioridades`, `/usuarios`, `/estatisticas`: 200.
- Tarefas têm `usuario` e `projeto` planos; não há objetos `usuarios`/`projetos` ou senha na resposta.
- A conta didática Alice é usuária comum em produção: vê apenas seus dados; listagem de projetos vazia é válida para essa conta e não é erro de conexão.
- `/tarefas/abc`, `/projetos/abc`: 400.
- `/tarefas/2147483648`, `/projetos/2147483648`: 400, após correção de overflow.
- IDs válidos inexistentes, como 2147483647: 404.

## Fluxo visual na produção e comprovação SQL

1. Login novo pela tela com a conta didática.
2. Envio de tarefa vazia mostrou o erro de campo obrigatório dentro do modal.
3. Criação de registro temporário próprio: ID 13, responsável Alice (10), sem projeto, prioridade média (3).
4. Edição pela tela para `Validação Prisma Dia 7 produção EDITADA 26-10-2026`, prioridade alta (4).
5. Recarregamento confirmou persistência da edição.
6. Movimentação pela tela para Em Andamento e Concluído; filtro Alta mostrou somente a tarefa correspondente.
7. SQL independente confirmou os campos, início `2026-10-26T10:27:05.888Z`, conclusão `2026-10-26T10:27:33.181Z` e auditoria de INSERT/UPDATE/UPDATE com ator 10.
8. Limpeza pela API, protegida por conferência do ID, texto exato e responsável: DELETE 204; GET posterior 404. A exclusão pela interface não faz parte desta evidência.

Contagens de produção antes/depois: usuários 8/8, projetos 5/5, tarefas 11/11. Auditoria 20/24, pois os quatro eventos do registro temporário (incluindo DELETE) foram preservados, como esperado. Nenhum dado de tarefa preexistente foi editado ou removido.

## Evidências locais

- `tmp/validacao-uc14-dia7/quadro-local.png`.
- `tmp/validacao-uc14-dia7/validacao-producao.png`.
- `tmp/validacao-uc14-dia7/tarefa-concluida-producao.png` — captura durante o teste, antes da limpeza do registro.
- `tmp/validacao-uc14-dia7/quadro-producao-final.png` — quadro após a limpeza.

## Ressalva

Funcionalidade validada nos fluxos acima não equivale a garantia de ausência de qualquer defeito ou vulnerabilidade. Permanecem três alertas altos de dependências ligados à mesma cadeia de `deepmerge-ts`/Prisma 6; detalhes e motivo para não aplicar uma mudança de versão principal automaticamente estão em `PRISMA.md`. O alerta separado do `body-parser` foi corrigido e os testes foram repetidos.
