require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL fehlt. Bitte in .env setzen.');
  process.exit(1);
}

async function check() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const version = await pool.query('SELECT version() AS version');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Connected to Postgres.');
    console.log(version.rows[0].version);
    console.log(`Tables in public schema: ${tables.rowCount}`);
    for (const row of tables.rows.slice(0, 20)) {
      console.log(` - ${row.table_name}`);
    }
  } finally {
    await pool.end();
  }
}

check().catch((error) => {
  console.error('Postgres check failed:', error);
  process.exit(1);
});
