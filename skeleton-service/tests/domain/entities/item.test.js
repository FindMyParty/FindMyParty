import { describe, it, expect } from "vitest";
import { Item, ItemStatus } from "../../../src/domain/entities/item.js";

describe("Item entity", () => {
  const validData = { name: "Test Item", description: "A test item" };

  describe("create", () => {
    it("creates an item with valid data", () => {
      const item = Item.create(validData);

      expect(item.id).toBeDefined();
      expect(item.name).toBe("Test Item");
      expect(item.description).toBe("A test item");
      expect(item.status).toBe(ItemStatus.ACTIVE);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });

    it("defaults status to active", () => {
      const item = Item.create({ name: "No status" });

      expect(item.status).toBe(ItemStatus.ACTIVE);
    });

    it("defaults description to null", () => {
      const item = Item.create({ name: "No desc" });

      expect(item.description).toBeNull();
    });

    it("throws on empty name", () => {
      expect(() => Item.create({ name: "" })).toThrow();
    });

    it("throws on missing name", () => {
      expect(() => Item.create({})).toThrow();
    });

    it("throws on name exceeding 255 characters", () => {
      expect(() => Item.create({ name: "x".repeat(256) })).toThrow();
    });
  });

  describe("fromPersistence", () => {
    it("reconstructs an item from persisted data", () => {
      const now = new Date();
      const data = {
        id: crypto.randomUUID(),
        name: "Persisted",
        description: "From DB",
        status: ItemStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      const item = Item.fromPersistence(data);

      expect(item.id).toBe(data.id);
      expect(item.name).toBe("Persisted");
    });

    it("throws on invalid persisted data", () => {
      expect(() => Item.fromPersistence({ name: "Missing fields" })).toThrow();
    });
  });

  describe("update", () => {
    it("updates name and bumps updatedAt", () => {
      const item = Item.create(validData);
      const originalUpdatedAt = item.updatedAt;

      // Small delay to ensure timestamp difference
      item.update({ name: "Updated Name" });

      expect(item.name).toBe("Updated Name");
      expect(item.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });

    it("updates description", () => {
      const item = Item.create(validData);
      item.update({ description: "New description" });

      expect(item.description).toBe("New description");
    });

    it("updates status", () => {
      const item = Item.create(validData);
      item.update({ status: ItemStatus.INACTIVE });

      expect(item.status).toBe(ItemStatus.INACTIVE);
    });

    it("throws on invalid update data", () => {
      const item = Item.create(validData);

      expect(() => item.update({ name: "" })).toThrow();
    });
  });

  describe("activate / deactivate", () => {
    it("deactivates an active item", () => {
      const item = Item.create(validData);
      item.deactivate();

      expect(item.status).toBe(ItemStatus.INACTIVE);
      expect(item.isActive()).toBe(false);
    });

    it("activates an inactive item", () => {
      const item = Item.create(validData);
      item.deactivate();
      item.activate();

      expect(item.status).toBe(ItemStatus.ACTIVE);
      expect(item.isActive()).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("serializes to a plain object with ISO date strings", () => {
      const item = Item.create(validData);
      const json = item.toJSON();

      expect(json.id).toBe(item.id);
      expect(json.name).toBe("Test Item");
      expect(json.description).toBe("A test item");
      expect(json.status).toBe(ItemStatus.ACTIVE);
      expect(typeof json.createdAt).toBe("string");
      expect(typeof json.updatedAt).toBe("string");
    });
  });
});
