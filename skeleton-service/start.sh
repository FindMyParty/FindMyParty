#!/usr/bin/env bash
# start.sh — inicializa todas as dependências e sobe o skeleton-service
#
# Uso:
#   ./start.sh                  # Postgres + RabbitMQ
#   ./start.sh --observability  # inclui OTel Collector, Prometheus, Grafana, Loki, Tempo

set -euo pipefail

OBSERVABILITY=false
for arg in "$@"; do
  [[ "$arg" == "--observability" ]] && OBSERVABILITY=true
done

# ── Cores ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Pré-requisitos ─────────────────────────────────────────────────────────────
info "Verificando pré-requisitos..."

if ! command -v node &>/dev/null; then
  error "Node.js não encontrado. Instale em https://nodejs.org (versão 22+)"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 22 ]]; then
  error "Node.js 22+ é obrigatório. Versão atual: $(node --version)"
  exit 1
fi
success "Node.js $(node --version)"

if ! command -v docker &>/dev/null; then
  error "Docker não encontrado. Instale o Docker Desktop em https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info &>/dev/null; then
  warn "Docker Desktop não está em execução. Tentando iniciar..."

  DOCKER_DESKTOP_PATHS=(
    "/c/Program Files/Docker/Docker/Docker Desktop.exe"
    "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe"
  )

  STARTED=false
  for path in "${DOCKER_DESKTOP_PATHS[@]}"; do
    if [[ -f "$path" ]]; then
      "$path" &>/dev/null &
      STARTED=true
      break
    fi
  done

  if [[ "$STARTED" == false ]]; then
    # Fallback via cmd.exe (funciona no Git Bash e WSL)
    if command -v cmd.exe &>/dev/null; then
      cmd.exe /c start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe" &>/dev/null &
      STARTED=true
    fi
  fi

  if [[ "$STARTED" == false ]]; then
    error "Não foi possível localizar o Docker Desktop. Inicie-o manualmente e rode o script novamente."
    exit 1
  fi

  info "Aguardando Docker Desktop inicializar (pode levar até 60 segundos)..."
  RETRIES=60
  until docker info &>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [[ "$RETRIES" -le 0 ]]; then
      error "Docker Desktop não ficou pronto a tempo. Verifique se ele iniciou corretamente."
      exit 1
    fi
    sleep 2
  done
fi

success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ── Diretório do script ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Variáveis de ambiente ──────────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  warn ".env não encontrado — copiando de .env.example"
  cp .env.example .env
  success ".env criado. Revise as variáveis se necessário."
else
  success ".env encontrado"
fi

# ── Dependências npm ───────────────────────────────────────────────────────────
if [[ ! -d "node_modules" ]]; then
  info "Instalando dependências npm..."
  npm install
  success "Dependências instaladas"
else
  success "node_modules já existe"
fi

# ── Docker Compose ─────────────────────────────────────────────────────────────
COMPOSE_FILES="-f docker-compose.yml"
if [[ "$OBSERVABILITY" == true ]]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.observability.yml"
  info "Subindo infraestrutura completa (Postgres + RabbitMQ + Observabilidade)..."
else
  info "Subindo infraestrutura base (Postgres + RabbitMQ)..."
fi

docker compose $COMPOSE_FILES up -d

# ── Aguardar Postgres ──────────────────────────────────────────────────────────
info "Aguardando PostgreSQL ficar saudável..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U user -d skeleton &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -le 0 ]]; then
    error "PostgreSQL não ficou saudável a tempo."
    docker compose logs postgres
    exit 1
  fi
  sleep 1
done
success "PostgreSQL pronto"

# ── Aguardar RabbitMQ ──────────────────────────────────────────────────────────
info "Aguardando RabbitMQ ficar saudável..."
RETRIES=30
until docker compose exec -T rabbitmq rabbitmq-diagnostics ping &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -le 0 ]]; then
    error "RabbitMQ não ficou saudável a tempo."
    docker compose logs rabbitmq
    exit 1
  fi
  sleep 2
done
success "RabbitMQ pronto"

# ── Resumo de acesso ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Infraestrutura pronta!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  PostgreSQL     →  localhost:5432"
echo -e "  RabbitMQ AMQP  →  localhost:5672"
echo -e "  RabbitMQ UI    →  http://localhost:15672  (user/password)"
if [[ "$OBSERVABILITY" == true ]]; then
  echo -e "  OTel Collector →  localhost:4317 (gRPC) / 4318 (HTTP)"
  echo -e "  Prometheus     →  http://localhost:9090"
  echo -e "  Grafana        →  http://localhost:3001"
  echo -e "  Loki           →  http://localhost:3100"
  echo -e "  Tempo          →  http://localhost:3200"
fi
echo -e "  Swagger UI     →  http://localhost:3000/docs"

# ── Token de desenvolvimento ───────────────────────────────────────────────────
DEV_TOKEN=$(node --env-file=.env -e "
  const { createHmac } = require('crypto');
  const secret = process.env.JWT_SECRET;
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp     = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = Buffer.from(JSON.stringify({ sub: 'dev-user', role: 'dev', exp })).toString('base64url');
  const sig     = createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');
  console.log(header + '.' + payload + '.' + sig);
")

echo ""
echo -e "${YELLOW}  Dev JWT Token (válido 7 dias — cole no Authorize do Swagger):${NC}"
echo -e "  $DEV_TOKEN"
echo ""

# ── Iniciar serviço ────────────────────────────────────────────────────────────
info "Iniciando skeleton-service em http://localhost:3000 ..."
echo ""
npm start
