import { sql } from "kysely";

/** @param {import('kysely').Kysely<any>} db */
export async function up(db) {
  await db.schema
    .createTable("items")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("status", "varchar(50)", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

/** @param {import('kysely').Kysely<any>} db */
export async function down(db) {
  await db.schema.dropTable("items").execute();
}
