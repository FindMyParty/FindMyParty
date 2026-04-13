// 1. Initialize OpenTelemetry SDK (must be first — patches modules at startup)
import { initTelemetry, shutdownTelemetry } from "./observability/telemetry.js";
import { initSentry } from "./observability/sentry.js";

// 2. Validate env vars (env is validated on import)
import { env } from "./config/env.js";

// Initialize telemetry before anything else that uses instrumented modules
initTelemetry({
  otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  serviceName: "skeleton-service",
});

initSentry({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
});

import { logger } from "./shared/logger.js";
import { buildServer } from "./adapters/inbound/http/server.js";
import { InMemoryItemRepository } from "./adapters/outbound/db/in-memory-item.repository.js";
import { InMemoryEventPublisher } from "./adapters/outbound/messaging/in-memory-event.publisher.js";
import { ItemUseCase } from "./domain/use-cases/item.use-case.js";
import { ItemService } from "./application/services/item.service.js";

async function main() {
  // 3. Connect database (in-memory for skeleton)
  const itemRepository = new InMemoryItemRepository();
  logger.info("Database connected (in-memory)");

  // 4. Connect RabbitMQ (in-memory for skeleton)
  const eventPublisher = new InMemoryEventPublisher();
  logger.info("RabbitMQ connected (in-memory)");

  // 5. Register queue subscribers (none for skeleton)
  logger.info("Queue subscribers registered");

  // Wire dependencies
  const itemUseCase = new ItemUseCase({ itemRepository, eventPublisher });
  const itemService = new ItemService({ itemUseCase });

  // 6. Start HTTP server
  const server = await buildServer({
    itemService,
    dependencyCheckers: {
      postgres: async () => "ok",
      rabbitmq: async () => "ok",
      otel: async () => "ok",
    },
  });

  await server.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Server listening on port ${env.PORT}`);

  // 7. Handle SIGTERM and SIGINT — graceful shutdown
  async function shutdown(signal) {
    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");

    try {
      await server.close();
      logger.info("HTTP server closed");
    } catch (error) {
      logger.error(error, "Error closing HTTP server");
    }

    try {
      await shutdownTelemetry();
      logger.info("Telemetry shut down");
    } catch (error) {
      logger.error(error, "Error shutting down telemetry");
    }

    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error(error, "Failed to start service");
  process.exit(1);
});
