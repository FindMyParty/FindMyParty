/**
 * In-memory implementation of IEventPublisher.
 * Used for development and testing — not for production.
 *
 * Stores published events in an array for inspection in tests.
 */
export class InMemoryEventPublisher {
  /** @type {Array<{ routingKey: string, payload: object, publishedAt: Date }>} */
  #events = [];

  async publish(routingKey, payload) {
    this.#events.push({
      routingKey,
      payload,
      publishedAt: new Date(),
    });
  }

  /**
   * Returns all published events.
   * @returns {Array<{ routingKey: string, payload: object, publishedAt: Date }>}
   */
  get events() {
    return [...this.#events];
  }

  /**
   * Returns events matching a specific routing key.
   * @param {string} routingKey
   * @returns {Array<{ routingKey: string, payload: object, publishedAt: Date }>}
   */
  getByRoutingKey(routingKey) {
    return this.#events.filter((event) => event.routingKey === routingKey);
  }

  clear() {
    this.#events = [];
  }
}
