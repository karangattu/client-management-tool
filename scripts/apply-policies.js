// Script to apply RLS policies to Supabase
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const client = new Client({
    host: "db.waibklokngugagdgllve.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: "fWPGO4F6GujFGHOXd4aK",
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to database...");
    await client.connect();

    // Read the SQL file
    const sqlPath = path.join(__dirname, "..", "supabase", "policies.refresh.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Applying RLS policies...");
    await client.query(sql);
    console.log("✅ RLS policies applied successfully!");
  } catch (error) {
    console.error("❌ Error applying policies:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
