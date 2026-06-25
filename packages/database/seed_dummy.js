const { Client } = require('pg');
const crypto = require('crypto');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_4p1SlbcsAkwo@ep-patient-cake-atvzbxs5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function seed() {
  await client.connect();
  const userId = crypto.randomUUID();
  await client.query(`INSERT INTO "user" (id, email, name, created_at, updated_at) VALUES ($1, 'test@test.com', 'Test User', NOW(), NOW())`, [userId]);
  
  const orgId = crypto.randomUUID();
  await client.query(`INSERT INTO "organization" (id, name, slug) VALUES ($1, 'Test Org', 'test-org')`, [orgId]);
  
  const projectId = crypto.randomUUID();
  await client.query(`INSERT INTO "project" (id, organization_id, name, slug, created_by) VALUES ($1, $2, 'Test Project', 'test-project', $3)`, [projectId, orgId, userId]);
  
  const featureId = 'cm52abcd123';
  await client.query(`INSERT INTO "feature_request" (id, project_id, organization_id, title, description, created_by) VALUES ($1, $2, $3, 'Test Feature', 'Description', $4)`, [featureId, projectId, orgId, userId]);

  console.log("FEATURE ID:", featureId);
  await client.end();
}

seed().catch(err => { console.error(err); client.end(); });
