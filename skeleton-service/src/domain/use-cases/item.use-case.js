import { Item } from "../entities/item.js";
import { NotFoundError } from "../../shared/errors.js";

const EVENTS = Object.freeze({
  CREATED: "skeleton.item.created",
  UPDATED: "skeleton.item.updated",
  DELETED: "skeleton.item.deleted",
  ACTIVATED: "skeleton.item.activated",
  DEACTIVATED: "skeleton.item.deactivated",
});

export class ItemUseCase {
  constructor({ itemRepository, eventPublisher, metrics }) {
    this.itemRepository = itemRepository;
    this.eventPublisher = eventPublisher;
    this.metrics = metrics;
  }

  async #getItemOrThrow(id) {
    const item = await this.itemRepository.findById(id);
    if (!item) throw new NotFoundError("Item");
    return item;
  }

  async createItem(data) {
    const item = Item.create(data);
    await this.itemRepository.save(item);
    await this.eventPublisher.publish(EVENTS.CREATED, item.toJSON());
    this.metrics.recordItemCreated(item.status);
    return item;
  }

  async getItemById(id) {
    return this.#getItemOrThrow(id);
  }

  async listItems(filters) {
    return this.itemRepository.findAll(filters);
  }

  async updateItem(id, data) {
    const item = await this.#getItemOrThrow(id);
    item.update(data);
    await this.itemRepository.update(item);
    await this.eventPublisher.publish(EVENTS.UPDATED, item.toJSON());
    return item;
  }

  async deleteItem(id) {
    const item = await this.#getItemOrThrow(id);
    await this.itemRepository.deleteById(id);
    await this.eventPublisher.publish(EVENTS.DELETED, { id: item.id });
  }

  async activateItem(id) {
    const item = await this.#getItemOrThrow(id);
    item.activate();
    await this.itemRepository.update(item);
    await this.eventPublisher.publish(EVENTS.ACTIVATED, item.toJSON());
    return item;
  }

  async deactivateItem(id) {
    const item = await this.#getItemOrThrow(id);
    item.deactivate();
    await this.itemRepository.update(item);
    await this.eventPublisher.publish(EVENTS.DEACTIVATED, item.toJSON());
    return item;
  }
}
