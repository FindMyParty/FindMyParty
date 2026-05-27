import { z } from "zod";
import { ValidationError } from "../../../../shared/errors.js";
import { authMiddleware } from "../middleware/auth.js";

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

const SECURITY = [{ bearerAuth: [] }];

const itemResponse = { $ref: "Item#" };
const itemListResponse = { type: "array", items: { $ref: "Item#" } };
const errorResponse = { $ref: "Error#" };

const uuidParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", format: "uuid" } },
};

export default async function itemRoutes(fastify, options) {
  const { itemService } = options;

  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/items", {
    schema: {
      tags: ["Items"],
      summary: "Criar item",
      security: SECURITY,
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255, examples: ["Poção de cura"] },
          description: { type: "string", maxLength: 1000, examples: ["Restaura 2d4+2 pontos de vida"] },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
      response: {
        201: { type: "object", properties: { data: itemResponse } },
        400: errorResponse,
        401: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = createItemBody.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.createItem(result.data);
    return reply.status(201).send({ data });
  });

  fastify.get("/items", {
    schema: {
      tags: ["Items"],
      summary: "Listar items",
      security: SECURITY,
      querystring: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive"], description: "Filtrar por status" },
        },
      },
      response: {
        200: { type: "object", properties: { data: itemListResponse } },
        400: errorResponse,
        401: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = listItemsQuery.safeParse(request.query);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.listItems(result.data);
    return reply.status(200).send({ data });
  });

  fastify.get("/items/:id", {
    schema: {
      tags: ["Items"],
      summary: "Buscar item por ID",
      security: SECURITY,
      params: uuidParam,
      response: {
        200: { type: "object", properties: { data: itemResponse } },
        401: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.getItemById(result.data.id);
    return reply.status(200).send({ data });
  });

  fastify.put("/items/:id", {
    schema: {
      tags: ["Items"],
      summary: "Atualizar item",
      security: SECURITY,
      params: uuidParam,
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: "string", maxLength: 1000 },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
      response: {
        200: { type: "object", properties: { data: itemResponse } },
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
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

  fastify.delete("/items/:id", {
    schema: {
      tags: ["Items"],
      summary: "Remover item",
      security: SECURITY,
      params: uuidParam,
      response: {
        204: { type: "null", description: "Item removido com sucesso" },
        401: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    await itemService.deleteItem(result.data.id);
    return reply.status(204).send();
  });

  fastify.patch("/items/:id/activate", {
    schema: {
      tags: ["Items"],
      summary: "Ativar item",
      security: SECURITY,
      params: uuidParam,
      response: {
        200: { type: "object", properties: { data: itemResponse } },
        401: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.activateItem(result.data.id);
    return reply.status(200).send({ data });
  });

  fastify.patch("/items/:id/deactivate", {
    schema: {
      tags: ["Items"],
      summary: "Desativar item",
      security: SECURITY,
      params: uuidParam,
      response: {
        200: { type: "object", properties: { data: itemResponse } },
        401: errorResponse,
        404: errorResponse,
      },
    },
  }, async (request, reply) => {
    const result = idParams.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const data = await itemService.deactivateItem(result.data.id);
    return reply.status(200).send({ data });
  });
}
