import { pool, transaction } from './db.js';
export const DEMO_ORG = '00000000-0000-4000-8000-000000000001';
export async function seed() {
  if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE || process.env.DEMO_AUTH_ENABLED !== 'true') throw new Error('Seed only allowed in explicit local demo mode');
  await transaction(async db => {
    await db.query('INSERT INTO organizations(id,name) VALUES ($1,$2) ON CONFLICT DO NOTHING',[DEMO_ORG,'Wetland synthetic demonstration']);
    for (const role of ['staff','contributor','maintainer','approver']) await db.query('INSERT INTO members(organization_id,subject,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[DEMO_ORG,`demo-${role}`,role]);
    await db.query('INSERT INTO members(organization_id,subject,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[DEMO_ORG,'demo-backup','maintainer']);
  });
}
if(process.argv[1]?.match(/seed\.(ts|js)$/)) { try {await seed(); console.log('Synthetic demo memberships ready');} finally {await pool.end();} }
