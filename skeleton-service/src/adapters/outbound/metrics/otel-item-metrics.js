import { metrics } from "@opentelemetry/api";

export class OtelItemMetrics {
  constructor() {
    const meter = metrics.getMeter("skeleton-service");
    this.itemsCreatedCounter = meter.createCounter("skeleton_items_created_total", {
      description: "Total number of items created",
    });
  }

  recordItemCreated(status) {
    this.itemsCreatedCounter.add(1, { status });
  }
}
