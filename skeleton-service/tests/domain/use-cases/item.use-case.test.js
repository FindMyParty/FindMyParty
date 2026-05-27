import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemUseCase } from "../../../src/domain/use-cases/item.use-case.js";
import { Item, ItemStatus } from "../../../src/domain/entities/item.js";
import { NotFoundError } from "../../../src/shared/errors.js";

function createMockRepository() {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
  };
}

function createMockPublisher() {
  return {
    publish: vi.fn(),
  };
}

function createMockMetrics() {
  return {
    recordItemCreated: vi.fn(),
  };
}

function createItem(overrides = {}) {
  return Item.create({ name: "Test Item", description: "A description", ...overrides });
}

describe("ItemUseCase", () => {
  let useCase;
  let itemRepository;
  let eventPublisher;
  let metrics;

  beforeEach(() => {
    itemRepository = createMockRepository();
    eventPublisher = createMockPublisher();
    metrics = createMockMetrics();
    useCase = new ItemUseCase({ itemRepository, eventPublisher, metrics });
  });

  describe("createItem", () => {
    it("creates an item, saves it, and publishes an event", async () => {
      const data = { name: "New Item", description: "Desc" };

      const result = await useCase.createItem(data);

      expect(result).toBeInstanceOf(Item);
      expect(result.name).toBe("New Item");
      expect(result.description).toBe("Desc");
      expect(result.status).toBe(ItemStatus.ACTIVE);
      expect(itemRepository.save).toHaveBeenCalledWith(result);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "skeleton.item.created",
        result.toJSON(),
      );
      expect(metrics.recordItemCreated).toHaveBeenCalledWith(result.status);
    });

    it("creates an item with default status when not provided", async () => {
      const result = await useCase.createItem({ name: "Minimal" });

      expect(result.status).toBe(ItemStatus.ACTIVE);
      expect(result.description).toBeNull();
    });
  });

  describe("getItemById", () => {
    it("returns the item when found", async () => {
      const item = createItem();
      itemRepository.findById.mockResolvedValue(item);

      const result = await useCase.getItemById(item.id);

      expect(result).toBe(item);
      expect(itemRepository.findById).toHaveBeenCalledWith(item.id);
    });

    it("throws NotFoundError when item does not exist", async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(useCase.getItemById("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listItems", () => {
    it("returns all items from the repository", async () => {
      const items = [createItem({ name: "A" }), createItem({ name: "B" })];
      itemRepository.findAll.mockResolvedValue(items);

      const result = await useCase.listItems();

      expect(result).toEqual(items);
      expect(itemRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it("passes filters to the repository", async () => {
      const filters = { status: ItemStatus.ACTIVE };
      itemRepository.findAll.mockResolvedValue([]);

      await useCase.listItems(filters);

      expect(itemRepository.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe("updateItem", () => {
    it("updates the item, persists, and publishes an event", async () => {
      const item = createItem();
      itemRepository.findById.mockResolvedValue(item);

      const result = await useCase.updateItem(item.id, { name: "Updated" });

      expect(result.name).toBe("Updated");
      expect(itemRepository.update).toHaveBeenCalledWith(item);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "skeleton.item.updated",
        item.toJSON(),
      );
    });

    it("throws NotFoundError when item does not exist", async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.updateItem("nonexistent-id", { name: "X" }),
      ).rejects.toThrow(NotFoundError);
      expect(itemRepository.update).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe("deleteItem", () => {
    it("deletes the item and publishes an event", async () => {
      const item = createItem();
      itemRepository.findById.mockResolvedValue(item);

      await useCase.deleteItem(item.id);

      expect(itemRepository.deleteById).toHaveBeenCalledWith(item.id);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "skeleton.item.deleted",
        { id: item.id },
      );
    });

    it("throws NotFoundError when item does not exist", async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(useCase.deleteItem("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
      expect(itemRepository.deleteById).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe("activateItem", () => {
    it("activates the item, persists, and publishes an event", async () => {
      const item = createItem();
      item.deactivate();
      itemRepository.findById.mockResolvedValue(item);

      const result = await useCase.activateItem(item.id);

      expect(result.status).toBe(ItemStatus.ACTIVE);
      expect(itemRepository.update).toHaveBeenCalledWith(item);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "skeleton.item.activated",
        item.toJSON(),
      );
    });

    it("throws NotFoundError when item does not exist", async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(useCase.activateItem("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
      expect(itemRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deactivateItem", () => {
    it("deactivates the item, persists, and publishes an event", async () => {
      const item = createItem();
      itemRepository.findById.mockResolvedValue(item);

      const result = await useCase.deactivateItem(item.id);

      expect(result.status).toBe(ItemStatus.INACTIVE);
      expect(itemRepository.update).toHaveBeenCalledWith(item);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        "skeleton.item.deactivated",
        item.toJSON(),
      );
    });

    it("throws NotFoundError when item does not exist", async () => {
      itemRepository.findById.mockResolvedValue(null);

      await expect(useCase.deactivateItem("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
      expect(itemRepository.update).not.toHaveBeenCalled();
    });
  });
});
