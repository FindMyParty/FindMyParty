import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { AppError } from "../../../shared/errors.js";
import { loggerConfig } from "../../../shared/logger.js";
import healthRoutes from "./routes/health.js";
import itemRoutes from "./routes/item.routes.js";
import metricsRoutes from "./routes/metrics.js";

/**
 * Build a Fastify instance with cors, helmet, error handler, and health route.
 *
 * @param {{ dependencyCheckers?: Record<string, () => Promise<string>>, itemService?: import('../../../application/services/item.service.js').ItemService }} options
 */
export async function buildServer(options = {}) {
  const fastify = Fastify({ logger: loggerConfig });

  await fastify.register(cors);
  await fastify.register(helmet);

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    });
  });

  await fastify.register(healthRoutes, {
    dependencyCheckers: options.dependencyCheckers || {},
  });

  await fastify.register(metricsRoutes);

  if (options.itemService) {
    await fastify.register(itemRoutes, {
      itemService: options.itemService,
    });
  }

  return fastify;
}
