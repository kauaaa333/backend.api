require('dotenv').config();
const { Pool } = require('pg');
if (!process.env.DATABASE_URL)
  throw new Error('Configure DATABASE_URL para conectar o TaskFlow ao Neon.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: true,
});
pool.on('error', (error) =>
  console.error('Conexão com banco interrompida:', error.code || 'indisponível'),
);
async function transaction(action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { pool, query: (sql, values) => pool.query(sql, values), transaction };
