import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
  const rows = await sql`
    SELECT current_setting('server_version')    AS version,
           current_database()                  AS database,
           inet_server_addr()::text            AS db_host,
           COUNT(*)                            AS project_rows
    FROM projects;
  `;
  console.log(rows);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
