import { Pool } from 'pg';

const pool =  new Pool({
    connectionString: 'postgresql://postgres:alim123@localhost:5432/db_medflow',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
