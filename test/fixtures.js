const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
module.exports = async function prepararBancoDeTeste() {
  require('dotenv').config({ path: '.env.test.local', quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    !process.env.TEST_DATABASE_EXPECTED_HOST ||
    new URL(url).hostname !== process.env.TEST_DATABASE_EXPECTED_HOST
  ) {
    throw new Error(
      'Configure uma branch Neon isolada em TEST_DATABASE_URL e confirme seu host em TEST_DATABASE_EXPECTED_HOST. Nunca use produção.',
    );
  }
  if (
    process.env.DATABASE_URL &&
    new URL(url).hostname.replace('-pooler', '') ===
      new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '')
  ) {
    throw new Error('Testes não podem limpar o banco da aplicação.');
  }
  const pool = new Pool({ connectionString: url });
  try {
    const hash = await bcrypt.hash('123456', 12);
    await pool.query('BEGIN');
    await pool.query(
      'TRUNCATE comentarios,auditoria_tarefas,tarefas,projetos,usuarios RESTART IDENTITY',
    );
    await pool.query(
      "INSERT INTO usuarios(id,nome,email,senha_hash) VALUES(1,'Ana','ana@email.com',$1),(2,'Bruno','bruno@email.com',$1),(3,'Alice','alice@email.com',$1)",
      [hash],
    );
    // Somente na branch isolada: Alice é administradora para os testes de CRUD global.
    await pool.query('UPDATE usuarios SET administrador=true WHERE id=3');
    await pool.query(
      "INSERT INTO projetos(id,nome,descricao,usuario_id) VALUES(1,'TaskFlow MVP','Desenvolvimento do MVP da TaskFlow API',1),(2,'Docs UC12','Documentação das aulas da UC12',2)",
    );
    await pool.query(
      "INSERT INTO tarefas(id,texto,idprioridade,coluna,usuario_id,projeto_id,concluida_em) VALUES(1,'Estudar Node.js',4,'andamento',1,1,NULL),(2,'Fazer exercícios',4,'afazer',1,1,NULL),(3,'Testar Postman',3,'concluido',2,2,'2026-09-04T12:00:00.000Z')",
    );
    for (const [table, last] of [
      ['usuarios', 3],
      ['projetos', 2],
      ['tarefas', 3],
    ]) {
      await pool.query("SELECT setval(pg_get_serial_sequence($1,'id'),$2)", [table, last]);
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
  const appUrl = process.env.TEST_APP_DATABASE_URL || url;
  if (new URL(appUrl).hostname !== process.env.TEST_DATABASE_EXPECTED_HOST)
    throw new Error('A aplicação de testes deve usar a mesma branch isolada');
  process.env.DATABASE_URL = appUrl;
  process.env.TASKFLOW_PRODUCTION_SECURITY = 'false';
  const directUrl = new URL(appUrl);
  directUrl.hostname = directUrl.hostname.replace('-pooler', '');
  process.env.DIRECT_URL = directUrl.toString();
  process.env.JWT_SECRET = 'segredo-apenas-dos-testes-na-branch-isolada';
};
