# PRD: Skeleton Service

## Introduction

O Skeleton Service e um servico minimalista de referencia estrutural para o projeto FindMyParty. Ele implementa a arquitetura hexagonal (Ports and Adapters) definida no CLAUDE.md com um CRUD simples de "Item", servindo como template funcional que outros servicos podem copiar e adaptar. O servico usa JavaScript puro para manter a barreira de entrada baixa como material de referencia.

## Goals

- Fornecer uma implementacao de referencia completa da arquitetura hexagonal do projeto
- Demonstrar o fluxo completo: HTTP request -> log -> domain -> response
- Incluir todas as camadas da arquitetura (domain, application, adapters) com separacao clara
- Ter testes unitarios cobrindo use cases, routes e repository
- Incluir setup completo de observabilidade (OpenTelemetry + Sentry + pino)
- Funcionar sem dependencias externas (PostgreSQL, RabbitMQ) usando adapters in-memory
- Servir como ponto de partida copiavel para novos servicos

## User Stories

### US-001: Estrutura de diretorios do servico
**Description:** Como desenvolvedor, eu quero um servico com a estrutura de diretorios padrao do CLAUDE.md para que eu possa usa-lo como referencia ao criar novos servicos.

**Acceptance Criteria:**
- [ ] Estrutura de pastas segue exatamente o layout definido no CLAUDE.md
- [ ] Todos os arquivos base existem: main.js, env.js, errors.js, logger.js, types.js
- [ ] package.json com scripts: start, dev, test
- [ ] .env.example com todas as variaveis obrigatorias do CLAUDE.md
- [ ] Dockerfile funcional

### US-002: Configuracao e validacao de ambiente
**Description:** Como desenvolvedor, eu quero que as variaveis de ambiente sejam validadas no boot com zod para que erros de configuracao sejam detectados imediatamente.

**Acceptance Criteria:**
- [ ] src/config/env.js valida todas as variaveis com zod
- [ ] Processo encerra com mensagem clara se variavel obrigatoria estiver ausente
- [ ] process.env so e acessado dentro de src/config/env.js
- [ ] Variaveis: PORT, DATABASE_URL, RABBITMQ_URL, JWT_SECRET, NODE_ENV, LOG_LEVEL, OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN (opcional)

### US-003: Health check endpoint
**Description:** Como operador de infra, eu quero um endpoint GET /health para verificar se o servico esta rodando e se suas dependencias estao acessiveis.

**Acceptance Criteria:**
- [ ] GET /health retorna 200 com JSON: `{ "status": "ok", "dependencies": { "postgres": "ok", "rabbitmq": "ok", "otel": "ok" } }`
- [ ] Nao requer autenticacao
- [ ] Quando adapter in-memory esta ativo, dependencias retornam "ok" (simulado)

### US-004: Entidade Item no dominio
**Description:** Como desenvolvedor, eu quero uma entidade Item no dominio para demonstrar como modelar entidades seguindo a arquitetura hexagonal.

**Acceptance Criteria:**
- [ ] Entidade Item em src/domain/entities/item.js com campos: id, name, description, createdAt
- [ ] Funcao de fabrica para criar Item com validacao basica (name obrigatorio)
- [ ] Dominio nao importa nada de adapters/, config/ ou modulos Node.js built-in

### US-005: Ports inbound e outbound
**Description:** Como desenvolvedor, eu quero interfaces de port bem definidas para que a separacao entre dominio e infraestrutura fique clara.

**Acceptance Criteria:**
- [ ] Port inbound: IItemService com metodos createItem(data), getItemById(id), listItems()
- [ ] Port outbound: IItemRepository com metodos save(item), findById(id), findAll()
- [ ] Port outbound: IEventPublisher com metodo publish(routingKey, payload)
- [ ] Ports documentados com JSDoc descrevendo contrato esperado

### US-006: Use cases de Item
**Description:** Como desenvolvedor, eu quero use cases que implementem a logica de negocio dependendo apenas de ports para demonstrar o padrao hexagonal.

**Acceptance Criteria:**
- [ ] CreateItemUseCase: recebe dados, valida, cria Item, salva via repository port, publica evento `skeleton.item.created` via event port
- [ ] GetItemByIdUseCase: busca por id, retorna Item ou lanca NotFoundError
- [ ] ListItemsUseCase: retorna lista de todos os items
- [ ] Nenhum use case importa de adapters/ ou config/
- [ ] Cada use case loga a operacao via logger

### US-007: Adapter HTTP (Fastify routes)
**Description:** Como cliente da API, eu quero endpoints REST para criar, buscar e listar items.

**Acceptance Criteria:**
- [ ] POST /items — cria item, retorna `{ "data": { ... } }` com status 201
- [ ] GET /items/:id — retorna item por id, retorna `{ "data": { ... } }` com status 200
- [ ] GET /items — lista todos os items, retorna `{ "data": [...] }` com status 200
- [ ] Erros seguem formato padrao: `{ "error": { "code": "...", "message": "..." } }`
- [ ] Validacao de input com zod nos routes
- [ ] server.js configura Fastify com cors, helmet e error handler global

### US-008: Adapter outbound — Repository in-memory
**Description:** Como desenvolvedor, eu quero um repository in-memory que implemente o port outbound para que o servico funcione sem PostgreSQL.

**Acceptance Criteria:**
- [ ] InMemoryItemRepository implementa IItemRepository
- [ ] Dados armazenados em Map JavaScript
- [ ] Metodos save, findById, findAll funcionais
- [ ] Estrutura preparada para ser substituida por um adapter real de PostgreSQL/Kysely

### US-009: Adapter outbound — Event publisher in-memory
**Description:** Como desenvolvedor, eu quero um event publisher in-memory que implemente IEventPublisher para que o servico funcione sem RabbitMQ.

**Acceptance Criteria:**
- [ ] InMemoryEventPublisher implementa IEventPublisher
- [ ] Metodo publish loga o evento (routing key + payload) via pino
- [ ] Estrutura preparada para ser substituida por adapter real de RabbitMQ

### US-010: Application service (orquestracao)
**Description:** Como desenvolvedor, eu quero um application service que orquestre os use cases e faca o mapeamento entre DTOs e entidades do dominio.

**Acceptance Criteria:**
- [ ] ItemApplicationService recebe repository e event publisher via constructor injection
- [ ] Instancia e executa os use cases passando as dependencias
- [ ] Mapeia dados de entrada (DTO) para formato do dominio e vice-versa

### US-011: Observabilidade completa
**Description:** Como operador, eu quero que o servico tenha setup completo de OpenTelemetry e Sentry para monitoramento.

**Acceptance Criteria:**
- [ ] OpenTelemetry SDK inicializado em main.js antes de qualquer outro import
- [ ] Traces exportados para OTel Collector (configuravel via OTEL_EXPORTER_OTLP_ENDPOINT)
- [ ] Span names seguem padrao: `skeleton.[operation]` (ex: `skeleton.createItem`)
- [ ] Logger pino configurado com pino-loki transport
- [ ] Endpoint GET /metrics exposto para Prometheus
- [ ] Sentry inicializado se SENTRY_DSN estiver presente (opcional)
- [ ] Nenhum dado sensivel nos logs ou spans

### US-012: Boot sequence
**Description:** Como desenvolvedor, eu quero que main.js siga a sequencia de boot definida no CLAUDE.md.

**Acceptance Criteria:**
- [ ] Ordem: (1) OTel SDK, (2) validar env, (3) conectar DB (in-memory), (4) conectar RabbitMQ (in-memory), (5) registrar subscribers, (6) iniciar HTTP server
- [ ] Graceful shutdown em SIGTERM e SIGINT
- [ ] Logs claros em cada etapa do boot

### US-013: Testes unitarios — Use cases
**Description:** Como desenvolvedor, eu quero testes unitarios para os use cases para garantir que a logica de negocio funciona corretamente.

**Acceptance Criteria:**
- [ ] Testes com vitest
- [ ] CreateItemUseCase: testa criacao com sucesso, testa falha com name vazio
- [ ] GetItemByIdUseCase: testa busca com sucesso, testa NotFoundError para id inexistente
- [ ] ListItemsUseCase: testa lista vazia, testa lista com items
- [ ] Use cases testados com mocks/stubs dos ports (repository e event publisher)

### US-014: Testes unitarios — Routes (Fastify inject)
**Description:** Como desenvolvedor, eu quero testes dos routes HTTP usando Fastify inject para validar o comportamento dos endpoints.

**Acceptance Criteria:**
- [ ] POST /items retorna 201 com item criado
- [ ] POST /items retorna 400 para payload invalido
- [ ] GET /items/:id retorna 200 com item existente
- [ ] GET /items/:id retorna 404 para id inexistente
- [ ] GET /items retorna 200 com lista de items
- [ ] GET /health retorna 200

### US-015: Testes unitarios — Repository in-memory
**Description:** Como desenvolvedor, eu quero testes do repository in-memory para garantir que a camada de persistencia funciona corretamente.

**Acceptance Criteria:**
- [ ] save() armazena item e retorna o item salvo
- [ ] findById() retorna item existente
- [ ] findById() retorna null para id inexistente
- [ ] findAll() retorna todos os items salvos
- [ ] findAll() retorna array vazio quando nao ha items

### US-016: Auth middleware com logica minima
**Description:** Como desenvolvedor, eu quero um middleware de autenticacao com logica minima para demonstrar onde plugar a validacao JWT real.

**Acceptance Criteria:**
- [ ] Middleware em src/adapters/inbound/http/middleware/auth.js
- [ ] Verifica presenca do header Authorization
- [ ] Verifica formato Bearer <token>
- [ ] Retorna 401 (UnauthorizedError) se ausente ou formato invalido
- [ ] Nao valida o token em si (sem JWT real) — apenas verifica estrutura
- [ ] Injeta req.user com payload placeholder quando header e valido
- [ ] Comentario JSDoc explicando onde plugar validacao JWT real

### US-017: Script para criar novo servico a partir do skeleton
**Description:** Como desenvolvedor, eu quero um script que copie o skeleton-service e renomeie para um novo servico para acelerar a criacao de novos servicos.

**Acceptance Criteria:**
- [ ] Script em scripts/create-service.sh
- [ ] Recebe nome do servico como argumento (ex: `./scripts/create-service.sh profile`)
- [ ] Copia skeleton-service/ para [nome]-service/
- [ ] Substitui todas as referencias a "skeleton" pelo nome do novo servico
- [ ] Exibe instrucoes pos-criacao (instalar deps, configurar .env)

## Functional Requirements

- FR-1: O servico deve seguir a estrutura de diretorios hexagonal definida no CLAUDE.md
- FR-2: POST /items deve validar o body com zod (name obrigatorio, description opcional) e retornar 201 com o item criado no formato `{ "data": { id, name, description, createdAt } }`
- FR-3: GET /items/:id deve retornar 200 com o item ou 404 com erro no formato padrao
- FR-4: GET /items deve retornar 200 com `{ "data": [...] }`
- FR-5: GET /health deve retornar 200 sem autenticacao com status das dependencias
- FR-6: Todas as variaveis de ambiente devem ser validadas com zod no boot
- FR-7: O servico deve funcionar inteiramente com adapters in-memory (sem PostgreSQL ou RabbitMQ)
- FR-8: Eventos devem ser publicados via IEventPublisher apos criacao de item (routing key: `skeleton.item.created`)
- FR-9: Todos os erros HTTP devem seguir o formato `{ "error": { "code", "message" } }`
- FR-10: OpenTelemetry deve ser inicializado antes de qualquer outro modulo
- FR-11: O servico deve expor GET /metrics para Prometheus
- FR-12: Graceful shutdown deve ser implementado para SIGTERM e SIGINT
- FR-13: Auth middleware deve verificar presenca e formato do header Authorization (Bearer <token>) e retornar 401 se invalido
- FR-14: Script create-service.sh deve copiar skeleton-service e substituir todas as referencias ao nome do servico

## Non-Goals

- Nao incluir validacao JWT real (middleware auth.js verifica apenas formato do header, sem criptografia)
- Nao incluir docker-compose (servico roda standalone com adapters in-memory)
- Nao incluir migrations ou schema de banco de dados
- Nao incluir testes de integracao ou e2e
- Nao incluir CI/CD pipeline
- Nao incluir logica de negocio complexa — o dominio deve ser trivial
- Nao implementar conexao real com PostgreSQL ou RabbitMQ

## Technical Considerations

- **JavaScript puro:** desvio intencional do stack TypeScript para simplicidade como material de referencia. Usar JSDoc para documentar tipos nos ports e entidades
- **Adapters in-memory:** usar Map para repository e console/pino para event publisher. A estrutura deve deixar claro onde plugar adapters reais
- **Dependencias do package.json:** fastify, @fastify/cors, @fastify/helmet, zod, pino, pino-loki, amqplib (como dependencia mesmo sem uso real — para referencia), @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, @opentelemetry/exporter-metrics-otlp-http, @opentelemetry/exporter-trace-otlp-http, @sentry/node, vitest (devDependency)
- **Vitest:** configurar com resolve aliases se necessario para manter imports limpos
- **UUID:** usar crypto.randomUUID() nativo do Node.js para gerar IDs

## Success Metrics

- Desenvolvedor consegue copiar o skeleton-service, renomear e ter um novo servico funcional em menos de 30 minutos
- Todos os testes passam com `npm test`
- O servico inicia com `npm start` sem nenhuma dependencia externa
- A estrutura de diretorios e 1:1 com o diagrama do CLAUDE.md
- Qualquer violacao da dependency rule (domain importando de adapters) e facilmente identificavel

## Resolved Questions

- **Makefile/scripts auxiliares:** Sim — incluir script para copiar e renomear o skeleton para um novo servico
- **Auth middleware:** Logica minima (ex: verificar presenca de header Authorization e formato Bearer)
- **README.md:** Nao incluir
