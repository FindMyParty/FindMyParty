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
