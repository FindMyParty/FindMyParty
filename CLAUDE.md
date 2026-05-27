# CLAUDE.md

Read this entire file before writing any code.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js |
| HTTP | Fastify |
| Relational DB | PostgreSQL (kysely) |
| Messaging | RabbitMQ (amqplib) |
| Validation | zod |
| Logger | pino |
| Tests | vitest |
| Observability | OpenTelemetry · Prometheus · Loki · Tempo · Grafana · Sentry |

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

## Communication protocols

### Decision rule

> "Who is waiting for this response right now?"
> - User is waiting on screen → **HTTP**
> - Nobody is waiting → **RabbitMQ**

### HTTP — synchronous calls

Used between the API Gateway and services for all client-facing requests.
Also used for inter-service calls when an immediate response is required (e.g. auth-service validating a token).

- All external traffic goes through NGINX (TLS termination at the edge)
- Internal traffic between gateway and services uses plain HTTP inside the private network
- Services never call each other directly via HTTP — only the gateway calls services

### RabbitMQ — asynchronous events

Used for all side effects that do not require an immediate response.
A service publishes an event and moves on — it never waits for downstream reactions.

Routing key pattern: `[service].[entity].[action]`

Examples:
- `profile.user.created`
- `match.match.created`
- `party.member.joined`
- `chat.message.sent`

Always publish through `IEventPublisher` — never import the RabbitMQ client directly in a use case.
Failed messages go to dead letter queue automatically.

### WebSocket — real-time

Used for chat and live notifications.
Managed inside the Chat Service — the gateway proxies the WebSocket connection through NGINX.

### TLS strategy

| Layer | Protocol |
|---|---|
| Client → NGINX | HTTPS (TLS termination) |
| NGINX → services | HTTP (private network) |
| Service → service (events) | RabbitMQ over private network |

mTLS between internal services is deferred — not part of the current scope.

---

## Patterns

### Repository pattern
Every database operation lives in a repository class inside `adapters/outbound/db/`.
Repositories implement an outbound port interface defined in `domain/ports/outbound/`.
No query outside a repository. No business logic inside a repository.

### Event-driven architecture
Services communicate exclusively through RabbitMQ events for async operations.
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

All code in English: variable names, function names, class names, comments, commit messages, branch names, error codes, routing keys, column names.

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
LOG_LEVEL                      # default: info
OTEL_EXPORTER_OTLP_ENDPOINT    # OTel Collector URL
SENTRY_DSN                     # optional
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

1. Initialize OpenTelemetry SDK (must be first — patches modules at startup)
2. Validate env vars
3. Connect database
4. Connect RabbitMQ
5. Register queue subscribers
6. Start HTTP server
7. Handle `SIGTERM` and `SIGINT` — graceful shutdown

---

## Observability

Every service is instrumented with **OpenTelemetry** from day one.
The OTel SDK is the only instrumentation layer — it exports to all backends without code changes.

| Concern | Tool |
|---|---|
| Logs | Loki (collected via pino + pino-loki transport) |
| Metrics | Prometheus (each service exposes `GET /metrics`) |
| Tracing | Tempo (distributed traces via OTel exporter) |
| Dashboards | Grafana (unified view of logs, metrics, traces) |
| Error tracking | Sentry (exceptions with stack trace context) |

### Instrumentation rules

- Initialize the OTel SDK in `main.ts` before anything else — it must patch modules at startup
- Every service exports traces to the OTel Collector; never export directly to Tempo or Jaeger
- Span names follow the pattern: `[service].[operation]` (e.g. `profile.createUser`)
- Never log sensitive data — no passwords, tokens, or PII in logs or spans
- Sentry DSN is an env var (`SENTRY_DSN`) — optional, service starts normally if absent

### Required env vars for observability

```
OTEL_EXPORTER_OTLP_ENDPOINT   # OTel Collector URL
SENTRY_DSN                     # optional
```

### Health check includes observability status

```json
{
  "status": "ok",
  "dependencies": {
    "postgres": "ok",
    "rabbitmq": "ok",
    "otel": "ok"
  }
}
```

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
