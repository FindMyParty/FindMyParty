/**
 * ItemService — Application layer orchestrator.
 *
 * Sits between HTTP routes and domain use cases.
 * Responsibilities:
 *   - Delegates to ItemUseCase for business logic
 *   - Maps domain entities to response DTOs (toJSON)
 *   - Keeps routes free from domain entity knowledge
 */
export class ItemService {
  /**
   * @param {{ itemUseCase: import('../../domain/ports/inbound/item-use-case.port.js').IItemUseCase }} deps
   */
  constructor({ itemUseCase }) {
    this.itemUseCase = itemUseCase;
  }

  async createItem(data) {
    const item = await this.itemUseCase.createItem(data);
    return item.toJSON();
  }

  async getItemById(id) {
    const item = await this.itemUseCase.getItemById(id);
    return item.toJSON();
  }

  async listItems(filters) {
    const items = await this.itemUseCase.listItems(filters);
    return items.map((item) => item.toJSON());
  }

  async updateItem(id, data) {
    const item = await this.itemUseCase.updateItem(id, data);
    return item.toJSON();
  }

  async deleteItem(id) {
    await this.itemUseCase.deleteItem(id);
  }

  async activateItem(id) {
    const item = await this.itemUseCase.activateItem(id);
    return item.toJSON();
  }

  async deactivateItem(id) {
    const item = await this.itemUseCase.deactivateItem(id);
    return item.toJSON();
  }
}
