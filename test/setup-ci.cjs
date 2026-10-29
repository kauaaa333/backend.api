// Apenas para o PostgreSQL efêmero do CI. Nunca aplica DDL no Neon.
const { Pool } = require('pg');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const url = new URL(process.env.TEST_DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/taskflow_ci')
    throw new Error('Setup CI bloqueado: exige localhost/taskflow_ci.');
  const result = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    stdio: 'inherit', env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() },
  });
  if (result.status !== 0) throw new Error('Falha ao preparar schema do CI.');
  const pool = new Pool({ connectionString: url.toString() });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'ci-extras.sql'), 'utf8'));
    await pool.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='app_usuario') THEN CREATE ROLE app_usuario LOGIN PASSWORD 'ci-app-only'; END IF; END $$");
    await pool.query('GRANT USAGE ON SCHEMA public TO app_usuario');
    await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON usuarios,projetos,tarefas,comentarios TO app_usuario');
    await pool.query('GRANT SELECT ON prioridades TO app_usuario');
    await pool.query('GRANT SELECT,INSERT ON auditoria_tarefas TO app_usuario');
    await pool.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO app_usuario');
    await pool.query("INSERT INTO prioridades(id,descricao,ativo) VALUES(1,'baixissima',true),(2,'baixa',true),(3,'media',true),(4,'alta',true),(5,'urgente',true)");
    console.log('Banco CI preparado sem dados de produção.');
  } finally { await pool.end(); }
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
