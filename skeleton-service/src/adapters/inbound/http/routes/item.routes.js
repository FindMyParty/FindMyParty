import { z } from "zod";
import { ValidationError } from "../../../../shared/errors.js";

const createItemBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateItemBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const idParams = z.object({
  id: z.string().uuid(),
});

const listItemsQuery = z.object({
  status: z.enum(["active", "inactive"]).optional(),
});

/**
 * Item routes — CRUD endpoints for items.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ itemUseCase: import('../../../../domain/ports/inbound/item-use-case.port.js').IItemUseCase }} options
 */
export default async function itemRoutes(fastify, options) {
  const { itemUseCase } = options;

  fastify.post("/items", async (request, reply) => {
    const result = createItemBody.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const item = await itemUseCase.createItem(result.data);
    return reply.status(201).send({ data: item.toJSON() });
  });

  fastify.get("/items", async (request, reply) => {
    const result = listItemsQuery.safeParse(request.query);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const items = await itemUseCase.listItems(result.data);
    return reply.status(200).send({ data: items.map((item) => item.toJSON()) });
  });

  fastify.get("/items/:id", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const item = await itemUseCase.getItemById(result.data.id);
    return reply.status(200).send({ data: item.toJSON() });
  });

  fastify.put("/items/:id", async (request, reply) => {
    const paramsResult = idParams.safeParse(request.params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.issues[0].message);
    }
    const bodyResult = updateItemBody.safeParse(request.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.issues[0].message);
    }
    const item = await itemUseCase.updateItem(paramsResult.data.id, bodyResult.data);
    return reply.status(200).send({ data: item.toJSON() });
  });

  fastify.delete("/items/:id", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    await itemUseCase.deleteItem(result.data.id);
    return reply.status(204).send();
  });

  fastify.patch("/items/:id/activate", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const item = await itemUseCase.activateItem(result.data.id);
    return reply.status(200).send({ data: item.toJSON() });
  });

  fastify.patch("/items/:id/deactivate", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const item = await itemUseCase.deactivateItem(result.data.id);
    return reply.status(200).send({ data: item.toJSON() });
  });
}
