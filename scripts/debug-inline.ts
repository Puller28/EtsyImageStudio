import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", transform: { undefined: null }, onnotice: () => {} });
  const rows = await sql`
    SELECT COUNT(*) FILTER (WHERE original_image_url LIKE 'data:%') AS original_data,
           COUNT(*) FILTER (WHERE mockup_images::text LIKE '%data:image/%') AS mockup_data,
           COUNT(*) FILTER (WHERE resized_images::text LIKE '%data:image/%') AS resized_data
    FROM projects
  `;
  console.log(rows);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
