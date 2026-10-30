# Backup e recuperação do TaskFlow

## Backup cifrado local

O operador guarda uma chave de 32 bytes, representada por 64 caracteres hexadecimais, em `TASKFLOW_BACKUP_KEY` dentro de `.env.backup.local`. O arquivo é privado e ignorado pelo Git/Vercel. Faça uma cópia segura da chave separada dos backups: sem ela o backup não pode ser recuperado.

```text
node scripts/backup.cjs
```

O comando lê as seis tabelas em uma transação read-only Repeatable Read e grava somente um arquivo cifrado AES-256-GCM em `tmp/backups/`. Não grava JSON em claro, senhas ou hashes nos logs. O arquivo inclui as tabelas e é destinado à estrutura já existente; NÃO é substituto de um dump completo de schema, roles e funções. O schema Prisma e os complementos SQL do CI estão versionados para documentação, não para executar indiscriminadamente em produção.

## Ensaio isolado

```powershell
$env:TASKFLOW_ALLOW_TEST_RESTORE='true'
node scripts/backup.cjs --test-restore CAMINHO_DO_BACKUP_CIFRADO
Remove-Item Env:TASKFLOW_ALLOW_TEST_RESTORE
```

O ensaio usa `TEST_DATABASE_URL` e `TEST_DATABASE_EXPECTED_HOST`. Recusa o host da origem e destinos fora da branch isolada confirmada. Substitui os dados SOMENTE desse ambiente descartável, preservando datas, histórico e sequências. A comparação SHA-256 do conteúdo de todas as tabelas deve coincidir antes do commit; divergência causa rollback. Os testes da API depois recriam suas fixtures, removendo os dados restaurados do ambiente de testes.

## Recuperação real

1. Interromper novas gravações e identificar o último backup/snapshot íntegro.
2. Recuperar primeiro para uma branch NOVA, sem reassociar o compute de produção automaticamente.
3. Conferir tabelas, FKs, triggers, funções, permissões, datas e histórico. Testar a API contra a cópia.
4. Só após aprovação do responsável, trocar a conexão de produção, publicar e validar os fluxos.
5. Manter a origem e o backup anterior até confirmar a recuperação.

O script local não restaura sobre produção por design. A agenda de snapshots do Neon não estava habilitada na conta; não houve mudança de plano, cobrança, agenda ou escolha automática de armazenamento externo. Para proteção contínua contra perda deste computador, o responsável deve definir armazenamento privado fora da máquina e frequência/retenção antes de colocar dados críticos no sistema. Não enviar backups para este repositório público ou para artefatos públicos do GitHub Actions.
