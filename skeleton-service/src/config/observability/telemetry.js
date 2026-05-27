import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

let sdk = null;
let prometheusExporter = null;

/**
 * Initialize the OpenTelemetry SDK.
 * Must be called BEFORE any other imports that need instrumentation (http, fastify, etc.).
 *
 * @param {{ otlpEndpoint: string, serviceName?: string }} config
 */
export function initTelemetry({ otlpEndpoint, serviceName = "skeleton-service" }) {
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  prometheusExporter = new PrometheusExporter({
    preventServerStart: true,
  });

  sdk = new NodeSDK({
    serviceName,
    traceExporter,
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-runtime-node": { enabled: false },
      }),
    ],
  });

  sdk.start();
}

/**
 * Gracefully shut down the OTel SDK — flushes pending spans and metrics.
 */
export async function shutdownTelemetry() {
  if (sdk) {
    await sdk.shutdown();
  }
}

export function getPrometheusExporter() {
  return prometheusExporter;
}

export function isTelemetryInitialized() {
  return sdk !== null;
}

