import { createHmac } from "node:crypto";
import { env } from "../../../../config/env.js";
import { UnauthorizedError } from "../../../../utils/errors.js";

/**
 * Decode and verify an HMAC-SHA256 JWT.
 *
 * @param {string} token  - raw JWT string (header.payload.signature)
 * @param {string} secret - HMAC secret
 * @returns {object} decoded payload
 */
function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError();
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  const expectedSignature = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (expectedSignature !== signatureB64) {
    throw new UnauthorizedError();
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8"),
  );

  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new UnauthorizedError();
  }

  return payload;
}

/**
 * Fastify preHandler that extracts a Bearer JWT from the Authorization header,
 * verifies it, and injects the decoded payload into `request.user`.
 *
 * Usage — register on individual routes or as a global hook:
 *   fastify.addHook('preHandler', authMiddleware);
 *
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function authMiddleware(request, reply) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = header.slice(7);
  request.user = verifyJwt(token, env.JWT_SECRET);
}
