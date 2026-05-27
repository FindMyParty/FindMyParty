import { z } from "zod";

export const ItemStatus = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(ItemStatus).default(ItemStatus.ACTIVE),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createItemSchema = itemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export class Item {
  constructor({ id, name, description, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.description = description ?? null;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(data) {
    const parsed = createItemSchema.parse(data);
    const now = new Date();
    return new Item({
      id: crypto.randomUUID(),
      name: parsed.name,
      description: parsed.description ?? null,
      status: parsed.status,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data) {
    const parsed = itemSchema.parse(data);
    return new Item(parsed);
  }

  update(data) {
    if (data.name !== undefined) {
      this.name = z.string().min(1).max(255).parse(data.name);
    }
    if (data.description !== undefined) {
      this.description = z.string().max(1000).optional().parse(data.description) ?? null;
    }
    if (data.status !== undefined) {
      this.status = z.nativeEnum(ItemStatus).parse(data.status);
    }
    this.updatedAt = new Date();
    return this;
  }

  activate() {
    this.status = ItemStatus.ACTIVE;
    this.updatedAt = new Date();
    return this;
  }

  deactivate() {
    this.status = ItemStatus.INACTIVE;
    this.updatedAt = new Date();
    return this;
  }

  isActive() {
    return this.status === ItemStatus.ACTIVE;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
