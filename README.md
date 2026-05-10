# FindMyParty

Rede social para encontrar pessoas próximas que amam RPG de mesa tanto quanto você.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 22 |
| npm | 10 |
| Docker Desktop | qualquer versão recente |

---

## Início rápido

```bash
# 1. Entrar no serviço
cd skeleton-service

# 2. Instalar dependências
npm install

# 3. Criar arquivo de variáveis de ambiente
cp .env.example .env

# 4. Subir infraestrutura (Postgres + RabbitMQ)
docker compose up -d

# 5. Iniciar o serviço
npm start
```

O serviço estará disponível em `http://localhost:3000`.

---

## Script de inicialização automática

O script `start.sh` faz tudo automaticamente: verifica pré-requisitos, instala dependências,
sobe os containers, aguarda ficarem saudáveis e inicia o serviço.

```bash
cd skeleton-service

# Apenas Postgres + RabbitMQ
./start.sh

# Inclui stack de observabilidade (Prometheus, Grafana, Loki, Tempo)
./start.sh --observability
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` dentro do serviço desejado e ajuste conforme necessário.

| Variável | Padrão | Obrigatória | Descrição |
|---|---|---|---|
| `PORT` | `3000` | não | Porta HTTP do serviço |
| `DATABASE_URL` | — | sim | Connection string do PostgreSQL |
| `RABBITMQ_URL` | — | sim | URL do RabbitMQ |
| `JWT_SECRET` | — | sim | Segredo para validação de JWT |
| `NODE_ENV` | `development` | não | Ambiente (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | não | Nível de log (`fatal/error/warn/info/debug/trace`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | sim | URL do OTel Collector |
| `SENTRY_DSN` | — | não | DSN do Sentry (deixe vazio para desabilitar) |

---

## Comandos disponíveis

```bash
npm start        # Inicia o serviço
npm run dev      # Inicia com --watch (hot reload)
npm test         # Executa os testes unitários
```

---

## Endpoints

### Health

```
GET /health
```

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

### Metrics

```
GET /metrics
```

Retorna métricas no formato Prometheus.

### Items (requer `Authorization: Bearer <token>`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/items` | Criar item |
| `GET` | `/items` | Listar items (query: `?status=active`) |
| `GET` | `/items/:id` | Buscar item por ID |
| `PUT` | `/items/:id` | Atualizar item |
| `DELETE` | `/items/:id` | Remover item |
| `PATCH` | `/items/:id/activate` | Ativar item |
| `PATCH` | `/items/:id/deactivate` | Desativar item |

---

## Infraestrutura local

### Serviços base (Postgres + RabbitMQ)

```bash
docker compose up -d       # subir
docker compose down        # parar (mantém volumes)
docker compose down -v     # parar e remover volumes
```

| Serviço | Porta |
|---|---|
| PostgreSQL | `5432` |
| RabbitMQ AMQP | `5672` |
| RabbitMQ Management UI | `15672` |

Painel RabbitMQ: `http://localhost:15672` — usuário `user`, senha `password`.

### Stack de observabilidade (opcional)

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

| Serviço | Porta |
|---|---|
| OTel Collector (gRPC) | `4317` |
| OTel Collector (HTTP) | `4318` |
| Prometheus | `9090` |
| Loki | `3100` |
| Tempo | `3200` |
| Grafana | `3001` |

Grafana: `http://localhost:3001` — login anônimo habilitado.

---

## Estrutura do monorepo

```
FindMyParty/
├── skeleton-service/        # Serviço de referência (hexagonal architecture)
│   ├── src/
│   │   ├── domain/          # Regras de negócio puras (sem dependências externas)
│   │   ├── application/     # Orquestração de use cases e mapeamento de DTOs
│   │   ├── adapters/        # HTTP (Fastify), PostgreSQL (Kysely), RabbitMQ
│   │   ├── config/          # Validação de env vars (zod) + OpenTelemetry + Sentry
│   │   └── utils/           # Errors, logger e types compartilhados
│   ├── tests/
│   ├── docker-compose.yml
│   ├── docker-compose.observability.yml
│   ├── .env.example
│   └── start.sh             # Script de inicialização automática
└── scripts/                 # Scripts utilitários do monorepo
```
