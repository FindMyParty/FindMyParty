# CLAUDE.md

Read this entire file before writing any code.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript |
| HTTP | Fastify |
| Relational DB | PostgreSQL (kysely) |
| Messaging | RabbitMQ (amqplib) |
| Validation | zod |
| Logger | pino |
| Tests | vitest |

---

## Architecture — Hexagonal (Ports and Adapters)

The domain must have zero knowledge of infrastructure.
HTTP, database, and RabbitMQ are all adapters — they plug into the domain through port interfaces.

```
[name]-service/
├── src/
│   ├── domain/                              # Pure domain — no framework, no DB, no I/O
│   │   ├── entities/                        # Domain entities and value objects
│   │   ├── ports/
│   │   │   ├── inbound/                     # Use case interfaces
│   │   │   └── outbound/                    # Repository + event interfaces
│   │   └── use-cases/                       # Business logic — depends only on ports
│   │
│   ├── application/
│   │   └── services/                        # Orchestrates use cases, maps DTOs
│   │
│   ├── adapters/
│   │   ├── inbound/
│   │   │   └── http/
│   │   │       ├── server.ts                # Fastify — cors, helmet, error handler
│   │   │       ├── middleware/
│   │   │       │   └── auth.ts              # JWT preHandler → injects req.user
│   │   │       └── routes/
│   │   │           ├── health.ts            # GET /health
│   │   │           └── [name].routes.ts
│   │   │
│   │   └── outbound/
│   │       ├── db/
│   │       │   ├── client.ts                # kysely singleton + Database interface
│   │       │   └── [name].repository.ts     # Implements outbound port
│   │       └── messaging/
│   │           ├── publisher.ts             # Implements IEventPublisher
│   │           └── subscriber.ts            # Registers queue consumers
│   │
│   ├── config/
│   │   └── env.ts                           # zod env validation — only place process.env is allowed
│   ├── shared/
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── types.ts
│   └── main.ts
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Dependency rule

```
HTTP route → application service → use case (domain) → port interface
                                                              ↑
                                              outbound adapter implements this
```

The domain never imports from `adapters/`, `config/`, or any Node.js built-in module.
Use cases only depend on port interfaces — never on concrete implementations.

---

## Patterns

### Repository pattern
Every database operation lives in a repository class inside `adapters/outbound/db/`.
Repositories implement an outbound port interface defined in `domain/ports/outbound/`.
No query outside a repository. No business logic inside a repository.

### Event-driven architecture
Services communicate exclusively through RabbitMQ events — never via direct HTTP calls between services.
Each service owns its events and is the only publisher of them.
Other services react by subscribing — they never call the origin service directly.

### Clean Code
- Functions do one thing
- Names are self-explanatory — no abbreviations (`usr`, `cfg`, `msg`)
- No magic numbers or strings — use named constants
- Max function length: ~20 lines. Extract if it grows beyond that
- No nested callbacks — async/await throughout
- No commented-out code in commits

---

## Language

All code in English: variable names, function names, class names, comments, commit messages, branch names, error codes, event routing keys, database column names.

---

## Messaging conventions

Routing key pattern: `[service].[entity].[action]`

Examples:
- `profile.user.created`
- `match.match.created`

Always publish through `IEventPublisher` — never import the RabbitMQ client directly in a use case.
Failed messages go to dead letter queue automatically.

---

## HTTP conventions

Success:
```json
{ "data": {} }
```

Error:
```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Error classes in `src/shared/errors.ts`:
- `AppError(message, statusCode, code)`
- `NotFoundError(resource)`
- `ValidationError(message)`
- `UnauthorizedError()`
- `ConflictError(message)`

---

## Environment variables (required in every service)

```
PORT
DATABASE_URL
RABBITMQ_URL
JWT_SECRET
NODE_ENV
LOG_LEVEL        # default: info
```

Validated with zod at boot. Missing required var = process exits with a clear message.
Never use `process.env` outside `src/config/env.ts`.

---

## Health check

Every service exposes `GET /health` — no auth required.

```json
{
  "status": "ok",
  "dependencies": {
    "postgres": "ok",
    "rabbitmq": "ok"
  }
}
```

---

## Boot sequence (`main.ts`)

1. Validate env vars
2. Connect database
3. Connect RabbitMQ
4. Register queue subscribers
5. Start HTTP server
6. Handle `SIGTERM` and `SIGINT` — graceful shutdown

---

## GitFlow

| Branch | Purpose |
|---|---|
| `main` | Production — protected, merge via PR only |
| `develop` | Integration — base for all feature branches |
| `feature/[name]` | New feature — branched from `develop` |
| `fix/[name]` | Bug fix — branched from `develop` |
| `hotfix/[name]` | Critical production fix — branched from `main` |
| `release/[version]` | Release prep — branched from `develop` |

Commit message format: `type(scope): short description`
Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`

Examples:
- `feat(profile): add character availability field`
- `fix(match): correct compatibility score calculation`
- `refactor(chat): extract message mapper to separate class`
