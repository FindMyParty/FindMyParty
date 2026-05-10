import { db } from "./client.js";
import { Item } from "../../../domain/entities/item.js";

/**
 * PostgreSQL implementation of IItemRepository.
 * All queries go through the kysely singleton — no raw SQL outside this file.
 *
 * Table: items (id, name, description, status, created_at, updated_at)
 */
export class PostgresItemRepository {
  /**
   * Maps a database row (snake_case) to an Item entity (camelCase).
   *
   * @param {{ id: string, name: string, description: string | null, status: string, created_at: Date, updated_at: Date }} row
   * @returns {Item}
   */
  #toEntity(row) {
    return Item.fromPersistence({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async save(item) {
    const data = item.toJSON();
    const row = await db
      .insertInto("items")
      .values({
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        created_at: new Date(data.createdAt),
        updated_at: new Date(data.updatedAt),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async findById(id) {
    const row = await db
      .selectFrom("items")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) return null;
    return this.#toEntity(row);
  }

  async findAll(filters) {
    let query = db.selectFrom("items").selectAll();

    if (filters?.status) {
      query = query.where("status", "=", filters.status);
    }

    const rows = await query.execute();
    return rows.map((row) => this.#toEntity(row));
  }

  async update(item) {
    const data = item.toJSON();
    const row = await db
      .updateTable("items")
      .set({
        name: data.name,
        description: data.description,
        status: data.status,
        updated_at: new Date(data.updatedAt),
      })
      .where("id", "=", data.id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.#toEntity(row);
  }

  async deleteById(id) {
    await db.deleteFrom("items").where("id", "=", id).execute();
  }
}
