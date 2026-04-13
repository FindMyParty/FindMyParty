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
 * Routes delegate to ItemService (application layer) which handles
 * domain orchestration and DTO mapping.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ itemService: import('../../../../application/services/item.service.js').ItemService }} options
 */
export default async function itemRoutes(fastify, options) {
  const { itemService } = options;

  fastify.post("/items", async (request, reply) => {
    const result = createItemBody.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.createItem(result.data);
    return reply.status(201).send({ data });
  });

  fastify.get("/items", async (request, reply) => {
    const result = listItemsQuery.safeParse(request.query);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.listItems(result.data);
    return reply.status(200).send({ data });
  });

  fastify.get("/items/:id", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.getItemById(result.data.id);
    return reply.status(200).send({ data });
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
    const data = await itemService.updateItem(paramsResult.data.id, bodyResult.data);
    return reply.status(200).send({ data });
  });

  fastify.delete("/items/:id", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    await itemService.deleteItem(result.data.id);
    return reply.status(204).send();
  });

  fastify.patch("/items/:id/activate", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.activateItem(result.data.id);
    return reply.status(200).send({ data });
  });

  fastify.patch("/items/:id/deactivate", async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.deactivateItem(result.data.id);
    return reply.status(200).send({ data });
  });
}
