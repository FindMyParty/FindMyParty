import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { NotFoundError } from "../../../../../src/utils/errors.js";

vi.mock("../../../../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret-key" },
}));

const { buildServer } = await import(
  "../../../../../src/adapters/inbound/http/server.js"
);

const SECRET = "test-secret-key";
const VALID_UUID = "00000000-0000-4000-a000-000000000001";

function createToken(payload = { sub: "user-123", role: "admin" }) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

const AUTH_HEADER = `Bearer ${createToken()}`;

const fakeItem = {
  id: VALID_UUID,
  name: "Test Item",
  description: "A test item",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function createMockItemService() {
  return {
    createItem: vi.fn(),
    getItemById: vi.fn(),
    listItems: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    activateItem: vi.fn(),
    deactivateItem: vi.fn(),
  };
}

describe("Item routes", () => {
  let server;
  let itemService;

  beforeEach(async () => {
    itemService = createMockItemService();
    server = await buildServer({ itemService });
  });

  // --- Auth ---

  describe("Authentication", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/items",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when token is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/items",
        headers: { authorization: "Bearer invalid-token" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });
  });

  // --- POST /items ---

  describe("POST /items", () => {
    it("creates an item and returns 201", async () => {
      itemService.createItem.mockResolvedValue(fakeItem);

      const response = await server.inject({
        method: "POST",
        url: "/items",
        headers: { authorization: AUTH_HEADER },
        payload: { name: "Test Item", description: "A test item" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ data: fakeItem });
      expect(itemService.createItem).toHaveBeenCalledWith({
        name: "Test Item",
        description: "A test item",
      });
    });

    it("returns 400 when name is missing", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/items",
        headers: { authorization: AUTH_HEADER },
        payload: { description: "no name" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when name is empty string", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/items",
        headers: { authorization: AUTH_HEADER },
        payload: { name: "" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  // --- GET /items ---

  describe("GET /items", () => {
    it("lists all items", async () => {
      itemService.listItems.mockResolvedValue([fakeItem]);

      const response = await server.inject({
        method: "GET",
        url: "/items",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: [fakeItem] });
      expect(itemService.listItems).toHaveBeenCalledWith({});
    });

    it("lists items filtered by status", async () => {
      itemService.listItems.mockResolvedValue([fakeItem]);

      const response = await server.inject({
        method: "GET",
        url: "/items?status=active",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      expect(itemService.listItems).toHaveBeenCalledWith({ status: "active" });
    });

    it("returns 400 for invalid status filter", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/items?status=invalid",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  // --- GET /items/:id ---

  describe("GET /items/:id", () => {
    it("returns an item by id", async () => {
      itemService.getItemById.mockResolvedValue(fakeItem);

      const response = await server.inject({
        method: "GET",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: fakeItem });
      expect(itemService.getItemById).toHaveBeenCalledWith(VALID_UUID);
    });

    it("returns 400 for invalid UUID", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/items/not-a-uuid",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 when item not found", async () => {
      itemService.getItemById.mockRejectedValue(new NotFoundError("Item"));

      const response = await server.inject({
        method: "GET",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    });
  });

  // --- PUT /items/:id ---

  describe("PUT /items/:id", () => {
    it("updates an item and returns 200", async () => {
      const updated = { ...fakeItem, name: "Updated" };
      itemService.updateItem.mockResolvedValue(updated);

      const response = await server.inject({
        method: "PUT",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: updated });
      expect(itemService.updateItem).toHaveBeenCalledWith(VALID_UUID, {
        name: "Updated",
      });
    });

    it("returns 400 for invalid UUID in params", async () => {
      const response = await server.inject({
        method: "PUT",
        url: "/items/bad-id",
        headers: { authorization: AUTH_HEADER },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 when item not found", async () => {
      itemService.updateItem.mockRejectedValue(new NotFoundError("Item"));

      const response = await server.inject({
        method: "PUT",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    });
  });

  // --- DELETE /items/:id ---

  describe("DELETE /items/:id", () => {
    it("deletes an item and returns 204", async () => {
      itemService.deleteItem.mockResolvedValue(undefined);

      const response = await server.inject({
        method: "DELETE",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(204);
      expect(itemService.deleteItem).toHaveBeenCalledWith(VALID_UUID);
    });

    it("returns 400 for invalid UUID", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/items/bad-id",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 when item not found", async () => {
      itemService.deleteItem.mockRejectedValue(new NotFoundError("Item"));

      const response = await server.inject({
        method: "DELETE",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    });
  });

  // --- PATCH /items/:id/activate ---

  describe("PATCH /items/:id/activate", () => {
    it("activates an item and returns 200", async () => {
      itemService.activateItem.mockResolvedValue(fakeItem);

      const response = await server.inject({
        method: "PATCH",
        url: `/items/${VALID_UUID}/activate`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: fakeItem });
      expect(itemService.activateItem).toHaveBeenCalledWith(VALID_UUID);
    });

    it("returns 400 for invalid UUID", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/items/bad-id/activate",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  // --- PATCH /items/:id/deactivate ---

  describe("PATCH /items/:id/deactivate", () => {
    it("deactivates an item and returns 200", async () => {
      itemService.deactivateItem.mockResolvedValue(fakeItem);

      const response = await server.inject({
        method: "PATCH",
        url: `/items/${VALID_UUID}/deactivate`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: fakeItem });
      expect(itemService.deactivateItem).toHaveBeenCalledWith(VALID_UUID);
    });

    it("returns 400 for invalid UUID", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/items/bad-id/deactivate",
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  // --- Error handler ---

  describe("Error handler", () => {
    it("returns 500 for unexpected errors", async () => {
      itemService.getItemById.mockRejectedValue(new Error("unexpected"));

      const response = await server.inject({
        method: "GET",
        url: `/items/${VALID_UUID}`,
        headers: { authorization: AUTH_HEADER },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error.code).toBe("INTERNAL_SERVER_ERROR");
    });
  });
});
