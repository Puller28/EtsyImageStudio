import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", transform: { undefined: null }, onnotice: () => {} });
  const rows = await sql`
    SELECT pid, query, state, wait_event_type, wait_event, now() - query_start AS runtime
    FROM pg_stat_activity
    WHERE state <> 'idle'
      AND pid <> pg_backend_pid();
  `;
  console.log(rows);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
