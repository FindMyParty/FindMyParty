import { logger } from "../../../shared/logger.js";

/**
 * Register RabbitMQ queue consumers on the given connection.
 * Called once at boot after the publisher has established the connection.
 *
 * Add queue bindings and consumer handlers here as the service grows.
 *
 * @param {import('amqplib').Connection} _connection
 */
export async function registerSubscribers(_connection) {
  logger.info("Queue subscribers registered");
}
