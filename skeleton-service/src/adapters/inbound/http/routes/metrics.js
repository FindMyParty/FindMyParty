import { getPrometheusExporter } from "../../../../observability/telemetry.js";

/**
 * Metrics route — GET /metrics (no auth required).
 * Serves Prometheus-formatted metrics from the OTel SDK.
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function metricsRoutes(fastify) {
  fastify.get("/metrics", async (request, reply) => {
    const exporter = getPrometheusExporter();

    if (!exporter) {
      return reply.status(503).send({
        error: { code: "METRICS_UNAVAILABLE", message: "Metrics not initialized" },
      });
    }

    const handler = exporter.getMetricsRequestHandler();
    reply.hijack();
    handler(request.raw, reply.raw);
  });
}
