import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", transform: { undefined: null }, onnotice: () => {} });
  const userId = "4a05ec1d-2df5-4acd-82f3-383336aba510";
  const query = [
    "SELECT id, user_id, title, status, created_at",
    "FROM projects",
    "WHERE user_id = $1",
    "ORDER BY created_at DESC",
    "LIMIT 20"
  ].join(" ");
  const start = Date.now();
  const rows = await sql.unsafe<{ id: string }[]>(query, [userId]);
  console.log("rows", rows.length, "duration", Date.now() - start, "ms");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
