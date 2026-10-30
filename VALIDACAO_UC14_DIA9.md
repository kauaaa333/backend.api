# UC14 — Dia 9: Swagger / OpenAPI

Material analisado: `UC14_Dia9_Swagger.pdf`, 27 páginas. O material foi usado como referência didática, não como instrução para substituir as regras existentes.

## Aplicado

- OpenAPI 3.0.3 modularizado: comum, autenticação, tarefas/estatísticas, projetos, usuários, prioridades e comentários.
- 17 caminhos e 27 operações, com parâmetros, entradas, saídas, erros e autenticação JWT.
- Swagger UI público em `/docs/`; JSON em `/docs/openapi.json`; APIs de negócio continuam protegidas.
- Servidor relativo à origem atual, para funcionar tanto localmente quanto na Vercel sem enviar tokens para outro host.
- Autorização não persistida e validador externo desabilitado; aviso sobre os efeitos reais de Try it out.
- Testes verificam a especificação com parser OpenAPI, todas as operações reais dos arquivos de rotas, recursos HTML/CSS/JS, autenticação e contratos principais.

## Adaptações necessárias em relação ao slide

- Respostas e entradas seguem o camelCase real (`usuarioId`, `projetoId`, `criadoEm` etc.), não os nomes SQL internos.
- Criação de tarefa exige somente texto; demais campos respeitam os padrões e permissões existentes. PUT de tarefa/projeto é parcial.
- DELETE permanece 204 sem corpo, em vez do exemplo 200 do material. Não alteramos o contrato para caber no slide.
- `/usuarios`, `/projetos`, prioridades, comentários e estatísticas exigem JWT; somente login é anônimo.
- Usuário público não inclui senha nem hash. A senha de entrada não tem exemplo real.
- Erros padronizados, Content-Type, validação de PUT e filtro `usuarioId` citados no slide já estavam corrigidos e foram preservados.

## Validação

Os 87 testes da suíte completa passaram localmente, incluindo cinco específicos da documentação e a validação estrutural OpenAPI. Auditoria de dependências sem vulnerabilidades conhecidas após a instalação. A publicação deve ser conferida no GitHub Actions e na Vercel; os resultados remotos são apresentados na entrega ao usuário.

Sem migração, limpeza ou modificação da estrutura do banco. Nenhuma credencial em exemplos, documentação ou Git.
