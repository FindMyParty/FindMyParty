/**
 * Outbound port — Event publisher interface.
 *
 * Defines the contract for publishing domain events.
 * Implementations live in adapters/outbound/messaging/.
 *
 * Routing key pattern: [service].[entity].[action]
 * Example: skeleton.item.created
 *
 * @typedef {Object} IEventPublisher
 * @property {(routingKey: string, payload: object) => Promise<void>} publish
 */
