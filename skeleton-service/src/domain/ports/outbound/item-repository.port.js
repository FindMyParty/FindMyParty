/**
 * Outbound port — Item repository interface.
 *
 * Defines the contract for Item persistence.
 * Implementations live in adapters/outbound/db/.
 *
 * @typedef {Object} IItemRepository
 * @property {(item: import('../../entities/item.js').Item) => Promise<import('../../entities/item.js').Item>} save
 * @property {(id: string) => Promise<import('../../entities/item.js').Item | null>} findById
 * @property {(filters?: { status?: string }) => Promise<import('../../entities/item.js').Item[]>} findAll
 * @property {(item: import('../../entities/item.js').Item) => Promise<import('../../entities/item.js').Item>} update
 * @property {(id: string) => Promise<void>} deleteById
 */

/**
 * Marker class for the outbound repository port.
 * Adapters implement this interface.
 */
export class IItemRepository {
  async save(_item) {
    throw new Error("Not implemented");
  }

  async findById(_id) {
    throw new Error("Not implemented");
  }

  async findAll(_filters) {
    throw new Error("Not implemented");
  }

  async update(_item) {
    throw new Error("Not implemented");
  }

  async deleteById(_id) {
    throw new Error("Not implemented");
  }
}
