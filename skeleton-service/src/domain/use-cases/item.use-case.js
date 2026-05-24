import { Item } from "../entities/item.js";
import { NotFoundError } from "../../utils/errors.js";

export class ItemUseCase {
  constructor({ itemRepository, eventPublisher, metrics }) {
    this.itemRepository = itemRepository;
    this.eventPublisher = eventPublisher;
    this.metrics = metrics;
  }

  async createItem(data) {
    const item = Item.create(data);
    await this.itemRepository.save(item);
    await this.eventPublisher.publish("skeleton.item.created", item.toJSON());
    this.metrics.recordItemCreated(item.status);
    return item;
  }

  async getItemById(id) {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Item");
    }
    return item;
  }

  async listItems(filters) {
    return this.itemRepository.findAll(filters);
  }

  async updateItem(id, data) {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Item");
    }
    item.update(data);
    await this.itemRepository.update(item);
    await this.eventPublisher.publish("skeleton.item.updated", item.toJSON());
    return item;
  }

  async deleteItem(id) {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Item");
    }
    await this.itemRepository.deleteById(id);
    await this.eventPublisher.publish("skeleton.item.deleted", { id });
  }

  async activateItem(id) {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Item");
    }
    item.activate();
    await this.itemRepository.update(item);
    await this.eventPublisher.publish("skeleton.item.activated", item.toJSON());
    return item;
  }

  async deactivateItem(id) {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Item");
    }
    item.deactivate();
    await this.itemRepository.update(item);
    await this.eventPublisher.publish("skeleton.item.deactivated", item.toJSON());
    return item;
  }
}
