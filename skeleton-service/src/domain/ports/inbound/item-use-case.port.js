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
