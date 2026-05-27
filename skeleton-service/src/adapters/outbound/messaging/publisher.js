import amqplib from "amqplib";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logger.js";

const EXCHANGE = "skeleton.events";

/**
 * Create a RabbitMQ publisher backed by a confirm channel.
 * All events are published to a topic exchange — routing key pattern: [service].[entity].[action].
 *
 * @returns {Promise<{
 *   publisher: { publish(routingKey: string, payload: object): Promise<void> },
 *   connection: import('amqplib').Connection,
 *   checkRabbitMQ(): Promise<"ok">,
 *   close(): Promise<void>
 * }>}
 */
export async function createAmqpPublisher() {
  const connection = await amqplib.connect(env.RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  logger.info({ exchange: EXCHANGE }, "RabbitMQ exchange asserted");

  const publisher = {
    /**
     * Publish an event to the exchange and wait for broker confirmation.
     *
     * @param {string} routingKey
     * @param {object} payload
     */
    async publish(routingKey, payload) {
      return new Promise((resolve, reject) => {
        const sent = channel.publish(
          EXCHANGE,
          routingKey,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true },
          (err) => (err ? reject(err) : resolve()),
        );
        if (!sent) {
          reject(new Error("RabbitMQ channel buffer full"));
        }
      });
    },
  };

  async function checkRabbitMQ() {
    if (!connection.connection?.serverProperties) {
      throw new Error("RabbitMQ disconnected");
    }
    return "ok";
  }

  async function close() {
    await channel.close();
    await connection.close();
  }

  return { publisher, connection, checkRabbitMQ, close };
}
