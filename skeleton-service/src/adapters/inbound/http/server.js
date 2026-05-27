import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { AppError } from "../../../shared/errors.js";
import { loggerConfig } from "../../../shared/logger.js";
import healthRoutes from "./routes/health.js";
import itemRoutes from "./routes/item.routes.js";
import metricsRoutes from "./routes/metrics.js";

const itemSchema = {
  $id: "Item",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", examples: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"] },
    name: { type: "string", examples: ["Poção de cura"] },
    description: { type: "string", nullable: true, examples: ["Restaura 2d4+2 pontos de vida"] },
    status: { type: "string", enum: ["active", "inactive"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorSchema = {
  $id: "Error",
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
      },
    },
  },
};

/**
 * Build a Fastify instance with cors, helmet, swagger, error handler, and all routes.
 *
 * @param {{ dependencyCheckers?: Record<string, () => Promise<string>>, itemService?: import('../../../application/services/item.service.js').ItemService }} options
 */
export async function buildServer(options = {}) {
  const fastify = Fastify({ logger: loggerConfig });

  await fastify.register(cors);

  // Disable CSP so the Swagger UI can load its inline scripts and styles
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Skeleton Service",
        description: "Serviço de referência — arquitetura hexagonal FindMyParty",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token JWT obtido via auth-service",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  fastify.addSchema(itemSchema);
  fastify.addSchema(errorSchema);

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: error.message },
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
