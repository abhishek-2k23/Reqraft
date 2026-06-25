const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://neondb_owner:npg_4p1SlbcsAkwo@ep-patient-cake-atvzbxs5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
client.connect()
  .then(() => client.query('SELECT id, title FROM feature_request LIMIT 5;'))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(err => { console.error(err); client.end(); });
