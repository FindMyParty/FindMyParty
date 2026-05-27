import { Item } from "../../../domain/entities/item.js";

/**
 * In-memory implementation of IItemRepository.
 * Used for development and testing — not for production.
 */
export class InMemoryItemRepository {
  /** @type {Map<string, object>} */
  #store = new Map();

  async save(item) {
    const data = item.toJSON();
    this.#store.set(item.id, data);
    return Item.fromPersistence({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  async findById(id) {
    const data = this.#store.get(id);
    if (!data) return null;
    return Item.fromPersistence({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  async findAll(filters) {
    let items = [...this.#store.values()];

    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    return items.map((data) =>
      Item.fromPersistence({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
    );
  }

  async update(item) {
    const data = item.toJSON();
    this.#store.set(item.id, data);
    return Item.fromPersistence({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  async deleteById(id) {
    this.#store.delete(id);
  }

  clear() {
    this.#store.clear();
  }
}
