import pg from 'pg';
import type { PoolClient } from 'pg';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export async function audit(db: PoolClient, org: string, actor: string, action: string, id: string, details = {}) {
  await db.query('INSERT INTO audit_events (organization_id,actor,action,entity_id,details) VALUES ($1,$2,$3,$4,$5)', [org, actor, action, id, details]);
}
