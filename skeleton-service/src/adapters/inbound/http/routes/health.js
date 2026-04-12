/**
 * Health check route — GET /health (no auth required).
 *
 * Accepts a `dependencyCheckers` map so adapters can register their own
 * liveness probes without the route knowing about concrete implementations.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ dependencyCheckers?: Record<string, () => Promise<string>> }} options
 */
export default async function healthRoutes(fastify, options) {
  const checkers = options.dependencyCheckers || {};

  fastify.get("/health", async (_request, reply) => {
    const dependencies = {};
    let allHealthy = true;

    const entries = Object.entries(checkers);

    const results = await Promise.allSettled(
      entries.map(async ([name, check]) => {
        const status = await check();
        return { name, status };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        dependencies[result.value.name] = result.value.status;
        if (result.value.status !== "ok") {
          allHealthy = false;
        }
      } else {
        const name = entries[results.indexOf(result)][0];
        dependencies[name] = "error";
        allHealthy = false;
      }
    }

    const statusCode = allHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: allHealthy ? "ok" : "degraded",
      dependencies,
    });
  });
}
