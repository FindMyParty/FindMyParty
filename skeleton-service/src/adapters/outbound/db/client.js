import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { env } from "../../../config/env.js";

/**
 * @typedef {{
 *   items: {
 *     id: string;
 *     name: string;
 *     description: string | null;
 *     status: string;
 *     created_at: Date;
 *     updated_at: Date;
 *   }
 * }} Database
 */

const pool = new Pool({ connectionString: env.DATABASE_URL });

/** @type {Kysely<Database>} */
export const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
});

/**
 * Verify the database connection by running a lightweight query.
 * Used as the postgres dependency checker in the health route.
 *
 * @returns {Promise<"ok">}
 */
export async function checkPostgres() {
  await sql`SELECT 1`.execute(db);
  return "ok";
}

/**
 * Gracefully close the database connection pool.
 */
export async function closeDatabase() {
  await db.destroy();
}
