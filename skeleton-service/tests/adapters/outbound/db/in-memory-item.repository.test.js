import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryItemRepository } from "../../../../src/adapters/outbound/db/in-memory-item.repository.js";
import { Item, ItemStatus } from "../../../../src/domain/entities/item.js";

function createItem(overrides = {}) {
  return Item.create({ name: "Test Item", description: "A description", ...overrides });
}

describe("InMemoryItemRepository", () => {
  let repository;

  beforeEach(() => {
    repository = new InMemoryItemRepository();
  });

  describe("save", () => {
    it("should save an item and return a reconstructed Item entity", async () => {
      const item = createItem();
      const saved = await repository.save(item);

      expect(saved).toBeInstanceOf(Item);
      expect(saved.id).toBe(item.id);
      expect(saved.name).toBe(item.name);
      expect(saved.description).toBe(item.description);
      expect(saved.status).toBe(item.status);
    });

    it("should persist the item so it can be retrieved later", async () => {
      const item = createItem();
      await repository.save(item);

      const found = await repository.findById(item.id);
      expect(found).not.toBeNull();
      expect(found.id).toBe(item.id);
    });
  });

  describe("findById", () => {
    it("should return the item when it exists", async () => {
      const item = createItem();
      await repository.save(item);

      const found = await repository.findById(item.id);
      expect(found).toBeInstanceOf(Item);
      expect(found.id).toBe(item.id);
      expect(found.name).toBe(item.name);
    });

    it("should return null when the item does not exist", async () => {
      const found = await repository.findById(crypto.randomUUID());
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all items when no filter is provided", async () => {
      const item1 = createItem({ name: "Item 1" });
      const item2 = createItem({ name: "Item 2" });
      await repository.save(item1);
      await repository.save(item2);

      const items = await repository.findAll();
      expect(items).toHaveLength(2);
      expect(items.every((i) => i instanceof Item)).toBe(true);
    });

    it("should return an empty array when no items exist", async () => {
      const items = await repository.findAll();
      expect(items).toEqual([]);
    });

    it("should filter items by status", async () => {
      const activeItem = createItem({ name: "Active" });
      const inactiveItem = createItem({ name: "Inactive" });
      inactiveItem.deactivate();

      await repository.save(activeItem);
      await repository.save(inactiveItem);

      const activeItems = await repository.findAll({ status: ItemStatus.ACTIVE });
      expect(activeItems).toHaveLength(1);
      expect(activeItems[0].name).toBe("Active");

      const inactiveItems = await repository.findAll({ status: ItemStatus.INACTIVE });
      expect(inactiveItems).toHaveLength(1);
      expect(inactiveItems[0].name).toBe("Inactive");
    });
  });

  describe("update", () => {
    it("should update and return the reconstructed Item entity", async () => {
      const item = createItem();
      await repository.save(item);

      item.update({ name: "Updated Name" });
      const updated = await repository.update(item);

      expect(updated).toBeInstanceOf(Item);
      expect(updated.name).toBe("Updated Name");
    });

    it("should persist the updated data", async () => {
      const item = createItem();
      await repository.save(item);

      item.update({ name: "Updated Name" });
      await repository.update(item);

      const found = await repository.findById(item.id);
      expect(found.name).toBe("Updated Name");
    });
  });

  describe("deleteById", () => {
    it("should remove the item from storage", async () => {
      const item = createItem();
      await repository.save(item);

      await repository.deleteById(item.id);
      const found = await repository.findById(item.id);
      expect(found).toBeNull();
    });

    it("should not throw when deleting a non-existent item", async () => {
      await expect(repository.deleteById(crypto.randomUUID())).resolves.toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should remove all items from storage", async () => {
      await repository.save(createItem({ name: "Item 1" }));
      await repository.save(createItem({ name: "Item 2" }));

      repository.clear();

      const items = await repository.findAll();
      expect(items).toEqual([]);
    });
  });
});
