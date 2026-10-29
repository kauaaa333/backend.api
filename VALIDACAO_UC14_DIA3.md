# Validação TaskFlow — UC14 Dia 3

Data: 21/10/2026 (America/Sao_Paulo).

## Publicação

Ambos os projetos foram publicados em produção e confirmados como READY:

- Front: https://task-flow-gamma-inky.vercel.app
- API: https://backend-api-black-seven.vercel.app
- Front deployment: `dpl_3NY6UrVVYbAXZEPy8HZG3fKqwd8c`.
- API deployment: `dpl_6qfA1ER4QCDyaPSNWH5auoHfG6zG`.

A publicação enviou os arquivos locais atuais diretamente à Vercel; não houve commit nem push para os repositórios Git.

## Alterações verificadas

- API lista somente prioridades ativas; estatísticas mantêm prioridades históricas.
- Filtro `usuarioId` das estatísticas aplicado de fato; atualização legada somente de `prioridade` reconhecida.
- Front carrega tarefas, prioridades, usuários e projetos em paralelo e não usa lista fixa para encobrir falha da API.
- Modal com labels e selects de responsável, projeto e prioridade; IDs numéricos no contrato camelCase da API.
- Projeto filtrado pelo responsável e preservado na edição; projeto continua opcional, conforme o contrato existente.
- CEP, cidade e ViaCEP retirados do formulário e dos cards.
- Erros da API em lista dentro do modal; texto vazio chega à validação do servidor; modal só fecha com sucesso.
- Botão desabilitado durante o envio; erros de rede usam `Não foi possível conectar à API.`.
- Nome do responsável nos cards, bordas para as cinco prioridades e botão explícito de edição.
- Usuário logado restaurado após recarregar; logout e 401 fora do login limpam usuário/token.
- Mantidos PUT parcial, prioridade Média ID 3, permissões e limite de duas tarefas em andamento por responsável.

## Testes automatizados

- API: `npm test` — 59 aprovados, zero falhas. Inclui a suíte com PostgreSQL real e os testes isolados da UC14.
- Banco de teste: branch `teste-status-seguranca-20261013` (`br-square-block-b6bz93y0`), endpoint `ep-muddy-cell-b6x8py24`; host conferido contra o projeto Neon e contra a produção antes de executar a fixture.
- A fixture existente limpa apenas o banco de teste. A produção não foi limpa nem restaurada.
- Front: `npm test` — 9 aprovados, zero falhas.
- Front: `npm run lint` e `npm run build` aprovados.
- Verificação de espaços/conflitos: `git diff --check` aprovado; somente avisos LF/CRLF.

## Navegador local com PostgreSQL real

API em localhost:3002 conectada à branch de teste, front em localhost:5173.

1. Senha incorreta exibiu `Credenciais inválidas`, sem recarregar o login.
2. Abrir o quadro carregou as quatro rotas com 200. Em desenvolvimento, StrictMode repete o efeito; em produção foram exatamente quatro GETs.
3. Salvar texto vazio manteve o modal aberto e mostrou `O campo 'texto' é obrigatório`.
4. Criada a tarefa `Validação UC14 navegador 2026-10-21` (ID 25 no banco de teste).
5. Após F5, os selects vieram com responsável Ana (1), projeto TaskFlow MVP (1) e prioridade Alta (4).
6. Edição mudou responsável para Bruno (2), projeto para Docs UC12 (2) e prioridade para Urgente (5). SELECT direto confirmou os três IDs.
7. Movimentação para Concluído persistiu após F5; SELECT confirmou coluna `concluido` e `concluida_em` preenchida.
8. Exclusão persistiu após F5; SELECT confirmou ausência do ID 25.
9. Rede indisponível manteve o formulário aberto com `Não foi possível conectar à API.`; conectividade restaurada após o teste.
10. Login como usuário comum mostrou somente Ana no select e seus projetos, respeitando as permissões.

## Conferência em produção após publicar

Testes no navegador pelo endereço principal, usando a conta didática existente:

- Login incorreto mostrou a mensagem da API; login correto abriu o quadro.
- Texto vazio mostrou a lista de validação no modal.
- Criada pela interface a tarefa temporária `Validação temporária UC14 2026-10-21`, ID 12, responsável 10, prioridade 4 e sem projeto (a conta não tem projetos acessíveis).
- SELECT direto na branch production confirmou a gravação. Após F5, o card tinha borda Alta `rgb(239, 68, 68)`.
- Edição para Urgente persistiu como prioridade 5 e mudou a borda para `rgb(236, 72, 153)`.
- Movida pelas duas colunas até Concluído; após F5, SELECT confirmou `coluna='concluido'` e `concluida_em='2026-10-21T11:57:42.618Z'`.
- Exclusão pela interface confirmada. SELECT final confirmou que a tarefa temporária não existe.
- Rede da publicação: `/tarefas`, `/prioridades`, `/usuarios` e `/projetos` iniciadas com cerca de 1 ms de diferença; as quatro responderam 200.
- Console da aba final sem erros.

## Estado final do banco de produção

| Medida | Antes | Depois |
|---|---:|---:|
| Usuários | 8 | 8 |
| Projetos | 5 | 5 |
| Tarefas | 11 | 11 |
| Eventos de auditoria | 16 | 20 |

Os quatro eventos adicionais correspondem exclusivamente à tarefa temporária: INSERT, dois UPDATE e DELETE. As duas atualizações registram as mudanças de coluna; a troca isolada da prioridade não acrescenta evento nesse histórico de colunas. Dados existentes não foram editados.

## Evidências locais

- `tmp/validacao-uc14/modal-conexao.png`: erro de rede no ambiente de teste.
- `tmp/validacao-uc14/modal-validacao-producao.png`: modal publicado com selects e erro de texto vazio.
- `tmp/validacao-uc14/tarefa-concluida-producao.png`: tarefa temporária concluída antes da limpeza.
- `tmp/validacao-uc14/quadro-producao.png`: estado final publicado, sem a tarefa temporária.

As imagens ficam em diretório ignorado pelo Git e não contêm tokens ou senhas.
