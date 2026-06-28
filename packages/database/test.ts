import fs from 'fs';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { pullRequests } from './models/shipflow';

const req = JSON.parse(fs.readFileSync('../../req500.json', 'utf8'));
const payloadStr = Buffer.from(req.request.raw, 'base64').toString('utf8');
const lines = payloadStr.split('\n');
const jsonStr = lines[lines.length - 1] ?? '';
const event = JSON.parse(jsonStr);

async function test() {
  const client = new Client({ connectionString: "postgresql://neondb_owner:npg_4p1SlbcsAkwo@ep-patient-cake-atvzbxs5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
  await client.connect();
  const db = drizzle(client);

  try {
    const branchName = event.pull_request.head.ref as string;
    const match = branchName.match(/^feature\/(.+)$/);
    const featureId = match ? match[1] as string : null;

    const [pr] = await db.insert(pullRequests).values({
      id: `pr_${event.pull_request.id}`,
      featureId: featureId,
      installationId: event.installation?.id || 0,
      githubPrId: event.pull_request.id,
      githubPrUrl: event.pull_request.html_url,
      number: event.pull_request.number,
      title: event.pull_request.title,
      body: event.pull_request.body,
      authorLogin: event.pull_request.user?.login,
      headBranch: branchName,
      baseBranch: event.pull_request.base.ref,
      headSha: event.pull_request.head.sha,
      repoFullName: event.repository.full_name,
      state: event.pull_request.state || 'open',
    }).onConflictDoUpdate({
      target: pullRequests.id,
      set: {
        headSha: event.pull_request.head.sha,
        state: event.pull_request.state || 'open',
        title: event.pull_request.title,
        body: event.pull_request.body,
      }
    }).returning();
    if (pr) console.log('SUCCESS:', pr.id);
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await client.end();
  }
}
test();
