/**
 * Inbound port — Item use case interface.
 *
 * Application services and adapters depend on this contract.
 * Implementations live in domain/use-cases/.
 *
 * @typedef {Object} IItemUseCase
 * @property {(data: { name: string, description?: string, status?: string }) => Promise<import('../../entities/item.js').Item>} createItem
 * @property {(id: string) => Promise<import('../../entities/item.js').Item>} getItemById
 * @property {(filters?: { status?: string }) => Promise<import('../../entities/item.js').Item[]>} listItems
 * @property {(id: string, data: { name?: string, description?: string, status?: string }) => Promise<import('../../entities/item.js').Item>} updateItem
 * @property {(id: string) => Promise<void>} deleteItem
 * @property {(id: string) => Promise<import('../../entities/item.js').Item>} activateItem
 * @property {(id: string) => Promise<import('../../entities/item.js').Item>} deactivateItem
 */

/**
 * Marker class for the inbound port.
 * Use cases implement this interface.
 */
export class IItemUseCase {
  async createItem(_data) {
    throw new Error("Not implemented");
  }

  async getItemById(_id) {
    throw new Error("Not implemented");
  }

  async listItems(_filters) {
    throw new Error("Not implemented");
  }

  async updateItem(_id, _data) {
    throw new Error("Not implemented");
  }

  async deleteItem(_id) {
    throw new Error("Not implemented");
  }

  async activateItem(_id) {
    throw new Error("Not implemented");
  }

  async deactivateItem(_id) {
    throw new Error("Not implemented");
  }
}
