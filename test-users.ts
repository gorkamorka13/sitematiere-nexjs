import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./lib/db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    console.log("Columns in users table:", res.rows.map(r => r.column_name));
    
    // Also try simple query
    const manual = await db.execute(sql`SELECT * FROM users LIMIT 1`);
    console.log("Manual query success!");
  } catch (err) {
    console.error("DB Error Details:", err);
  }
}

run();
