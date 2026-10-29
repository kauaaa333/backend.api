// Backup cifrado local e ensaio de restauração APENAS na branch isolada.
require('dotenv').config({ quiet: true });
require('dotenv').config({ path: '.env.backup.local', quiet: true });
require('dotenv').config({ path: '.env.test.local', quiet: true });
const { Pool } = require('pg');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const tabelas = ['usuarios', 'prioridades', 'projetos', 'tarefas', 'comentarios', 'auditoria_tarefas'];
const chave = Buffer.from(process.env.TASKFLOW_BACKUP_KEY || '', 'hex');
if (chave.length !== 32) throw new Error('Configure a chave privada de backup de 32 bytes em .env.backup.local.');

async function ler(client) {
  const dados = {};
  for (const tabela of tabelas) dados[tabela] = (await client.query(`SELECT * FROM ${tabela} ORDER BY id`)).rows;
  return dados;
}
const digest = (dados) => crypto.createHash('sha256').update(JSON.stringify(dados)).digest('hex');

async function main() {
  const diretorio = path.resolve('tmp/backups');
  fs.mkdirSync(diretorio, { recursive: true });
  if (process.argv[2] !== '--test-restore') {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const dados = await ler(client);
      await client.query('COMMIT');
      const origem = new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', chave, iv);
      const payload = Buffer.concat([cipher.update(JSON.stringify({ versao: 1, origem, dados })), cipher.final()]);
      const file = path.join(diretorio, `taskflow-${Date.now()}.enc`);
      fs.writeFileSync(file, Buffer.concat([iv, cipher.getAuthTag(), payload]), { mode: 0o600 });
      console.log(JSON.stringify({ file, counts: Object.fromEntries(tabelas.map(t => [t, dados[t].length])), digest: digest(dados) }));
    } catch (erro) { await client.query('ROLLBACK'); throw erro; }
    finally { client.release(); await pool.end(); }
    return;
  }
  if (process.env.TASKFLOW_ALLOW_TEST_RESTORE !== 'true') throw new Error('Confirme TASKFLOW_ALLOW_TEST_RESTORE=true para o ensaio isolado.');
  const file = path.resolve(process.argv[3] || '');
  if (!file.startsWith(diretorio + path.sep) || !file.endsWith('.enc')) throw new Error('Backup fora do diretório permitido.');
  const bytes = fs.readFileSync(file);
  const decipher = crypto.createDecipheriv('aes-256-gcm', chave, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  const backup = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  if (backup.versao !== 1 || url.hostname !== process.env.TEST_DATABASE_EXPECTED_HOST ||
      url.hostname.replace('-pooler', '') === backup.origem ||
      tabelas.some(t => !Array.isArray(backup.dados[t]))) throw new Error('Destino de restauração inválido ou igual à produção.');
  const pool = new Pool({ connectionString: url.toString() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const tabela of tabelas) await client.query(`ALTER TABLE ${tabela} DISABLE TRIGGER USER`);
    await client.query(`TRUNCATE ${tabelas.join(',')} RESTART IDENTITY`);
    for (const tabela of tabelas) {
      const columns = (await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', ['public', tabela])).rows.map(r => r.column_name);
      for (const row of backup.dados[tabela]) {
        const keys = columns.filter(c => Object.hasOwn(row, c));
        await client.query(`INSERT INTO ${tabela} (${keys.map(c => '"' + c + '"').join(',')}) VALUES (${keys.map((_,i) => '$' + (i+1)).join(',')})`, keys.map(c => row[c]));
      }
      const max = Math.max(0, ...backup.dados[tabela].map(row => row.id));
      await client.query("SELECT setval(pg_get_serial_sequence($1,'id'),$2,$3)", [tabela, Math.max(1, max), max > 0]);
      await client.query(`ALTER TABLE ${tabela} ENABLE TRIGGER USER`);
    }
    const restaurado = await ler(client);
    if (digest(restaurado) !== digest(backup.dados)) throw new Error('Restauração divergente; transação cancelada.');
    await client.query('COMMIT');
    console.log(JSON.stringify({ restoreVerified: true, counts: Object.fromEntries(tabelas.map(t => [t, restaurado[t].length])), digest: digest(restaurado) }));
  } catch (erro) { await client.query('ROLLBACK'); throw erro; }
  finally { client.release(); await pool.end(); }
}
main().catch((erro) => { console.error(erro.message); process.exitCode = 1; });
