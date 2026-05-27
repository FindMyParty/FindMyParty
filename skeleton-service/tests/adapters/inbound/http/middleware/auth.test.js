import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

// Mock env before importing auth middleware
vi.mock("../../../../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret-key" },
}));

const { authMiddleware } = await import(
  "../../../../../src/adapters/inbound/http/middleware/auth.js"
);

const SECRET = "test-secret-key";

function createToken(payload, secret = SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function makeRequest(authorization) {
  return {
    headers: { authorization },
    user: undefined,
  };
}

describe("authMiddleware", () => {
  it("should inject request.user with decoded payload for a valid token", async () => {
    const payload = { sub: "user-123", role: "admin" };
    const token = createToken(payload);
    const request = makeRequest(`Bearer ${token}`);

    await authMiddleware(request, {});

    expect(request.user).toMatchObject(payload);
  });

  it("should throw UnauthorizedError when Authorization header is missing", async () => {
    const request = { headers: {}, user: undefined };

    await expect(authMiddleware(request, {})).rejects.toThrow("Unauthorized");
  });

  it("should throw UnauthorizedError when Authorization header does not start with Bearer", async () => {
    const request = makeRequest("Basic abc123");

    await expect(authMiddleware(request, {})).rejects.toThrow("Unauthorized");
  });

  it("should throw UnauthorizedError for a malformed token (not 3 parts)", async () => {
    const request = makeRequest("Bearer not-a-jwt");

    await expect(authMiddleware(request, {})).rejects.toThrow("Unauthorized");
  });

  it("should throw UnauthorizedError for a token signed with wrong secret", async () => {
    const token = createToken({ sub: "user-123" }, "wrong-secret");
    const request = makeRequest(`Bearer ${token}`);

    await expect(authMiddleware(request, {})).rejects.toThrow("Unauthorized");
  });

  it("should throw UnauthorizedError for an expired token", async () => {
    const expiredPayload = { sub: "user-123", exp: Math.floor(Date.now() / 1000) - 60 };
    const token = createToken(expiredPayload);
    const request = makeRequest(`Bearer ${token}`);

    await expect(authMiddleware(request, {})).rejects.toThrow("Unauthorized");
  });

  it("should accept a token without exp claim", async () => {
    const payload = { sub: "user-123" };
    const token = createToken(payload);
    const request = makeRequest(`Bearer ${token}`);

    await authMiddleware(request, {});

    expect(request.user).toMatchObject(payload);
  });

  it("should accept a token with future exp claim", async () => {
    const payload = { sub: "user-123", exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = createToken(payload);
    const request = makeRequest(`Bearer ${token}`);

    await authMiddleware(request, {});

    expect(request.user.sub).toBe("user-123");
  });
});
