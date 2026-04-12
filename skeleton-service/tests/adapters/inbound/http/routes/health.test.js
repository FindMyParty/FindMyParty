import { describe, it, expect } from "vitest";
import { buildServer } from "../../../../../src/adapters/inbound/http/server.js";

describe("GET /health", () => {
  it("returns ok when no dependency checkers are registered", async () => {
    const server = await buildServer();

    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      dependencies: {},
    });

    await server.close();
  });

  it("returns ok when all dependencies are healthy", async () => {
    const server = await buildServer({
      dependencyCheckers: {
        postgres: async () => "ok",
        rabbitmq: async () => "ok",
        otel: async () => "ok",
      },
    });

    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      dependencies: {
        postgres: "ok",
        rabbitmq: "ok",
        otel: "ok",
      },
    });

    await server.close();
  });

  it("returns 503 when a dependency is unhealthy", async () => {
    const server = await buildServer({
      dependencyCheckers: {
        postgres: async () => "ok",
        rabbitmq: async () => "error",
      },
    });

    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "degraded",
      dependencies: {
        postgres: "ok",
        rabbitmq: "error",
      },
    });

    await server.close();
  });

  it("returns 503 when a dependency checker throws", async () => {
    const server = await buildServer({
      dependencyCheckers: {
        postgres: async () => {
          throw new Error("connection refused");
        },
      },
    });

    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "degraded",
      dependencies: {
        postgres: "error",
      },
    });

    await server.close();
  });
});
