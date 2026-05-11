#!/usr/bin/env bash
#
# deploy.sh - Build and start (or stop) OpsinTech Platform production services
#
# Usage:
#   deploy.sh [up]   — build images and start containers (default)
#   deploy.sh down   — stop and remove containers
#
# Must be run from the repo root directory.

set -e

CMD="${1:-up}"
NO_BUILD=false
if [ "$2" = "--no-build" ] || [ "$1" = "--no-build" ]; then
    NO_BUILD=true
    CMD="up"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOCKER_DIR="$REPO_ROOT/docker"
COMPOSE_CMD=(docker compose -p opsintech -f "$DOCKER_DIR/docker-compose.yaml")

# ── Colors ────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── OPSINTECH_HOME ────────────────────────────────────────────────────────────

if [ -z "$OPSINTECH_HOME" ]; then
    export OPSINTECH_HOME="$REPO_ROOT/backend/.opsintech"
fi
echo -e "${BLUE}OPSINTECH_HOME=$OPSINTECH_HOME${NC}"
mkdir -p "$OPSINTECH_HOME"

# ── OPSINTECH_REPO_ROOT (for skills host path in DooD) ───────────────────────

export OPSINTECH_REPO_ROOT="$REPO_ROOT"

# ── .env ─────────────────────────────────────────────────────────────────────

if [ ! -f "$REPO_ROOT/.env" ]; then
    if [ -f "$REPO_ROOT/.env.example" ]; then
        cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
        echo -e "${GREEN}✓ Seeded .env.example → .env${NC}"
        echo -e "${YELLOW}⚠ Edit .env and set your API keys before use.${NC}"
    fi
fi

# ── config.yaml ───────────────────────────────────────────────────────────────

if [ -z "$OPSINTECH_CONFIG_PATH" ]; then
    export OPSINTECH_CONFIG_PATH="$REPO_ROOT/config.yaml"
fi

if [ ! -f "$OPSINTECH_CONFIG_PATH" ]; then
    if [ -f "$REPO_ROOT/config.example.yaml" ]; then
        cp "$REPO_ROOT/config.example.yaml" "$OPSINTECH_CONFIG_PATH"
        echo -e "${GREEN}✓ Seeded config.example.yaml → $OPSINTECH_CONFIG_PATH${NC}"
        echo -e "${YELLOW}⚠ config.yaml was seeded from the example template.${NC}"
        echo "  Edit $OPSINTECH_CONFIG_PATH and set your model API keys before use."
    else
        echo -e "${RED}✗ No config.yaml found.${NC}"
        echo "  Run 'make config' from the repo root to generate one,"
        echo "  then set the required model API keys."
        exit 1
    fi
else
    echo -e "${GREEN}✓ config.yaml: $OPSINTECH_CONFIG_PATH${NC}"
fi


# ── BETTER_AUTH_SECRET ───────────────────────────────────────────────────────
# Required by Next.js in production. Generated once and persisted so auth
# sessions survive container restarts.

_secret_file="$OPSINTECH_HOME/.better-auth-secret"
if [ -z "$BETTER_AUTH_SECRET" ]; then
    if [ -f "$_secret_file" ]; then
        export BETTER_AUTH_SECRET
        BETTER_AUTH_SECRET="$(cat "$_secret_file")"
        echo -e "${GREEN}✓ BETTER_AUTH_SECRET loaded from $_secret_file${NC}"
    else
        export BETTER_AUTH_SECRET
        BETTER_AUTH_SECRET="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
        echo "$BETTER_AUTH_SECRET" > "$_secret_file"
        chmod 600 "$_secret_file"
        echo -e "${GREEN}✓ BETTER_AUTH_SECRET generated → $_secret_file${NC}"
    fi
fi

# ── detect_sandbox_mode ───────────────────────────────────────────────────────

detect_sandbox_mode() {
    local sandbox_use=""
    local provisioner_url=""

    [ -f "$OPSINTECH_CONFIG_PATH" ] || { echo "local"; return; }

    sandbox_use=$(awk '
        /^[[:space:]]*sandbox:[[:space:]]*$/ { in_sandbox=1; next }
        in_sandbox && /^[^[:space:]#]/ { in_sandbox=0 }
        in_sandbox && /^[[:space:]]*use:[[:space:]]*/ {
            line=$0; sub(/^[[:space:]]*use:[[:space:]]*/, "", line); print line; exit
        }
    ' "$OPSINTECH_CONFIG_PATH")

    provisioner_url=$(awk '
        /^[[:space:]]*sandbox:[[:space:]]*$/ { in_sandbox=1; next }
        in_sandbox && /^[^[:space:]#]/ { in_sandbox=0 }
        in_sandbox && /^[[:space:]]*provisioner_url:[[:space:]]*/ {
            line=$0; sub(/^[[:space:]]*provisioner_url:[[:space:]]*/, "", line); print line; exit
        }
    ' "$OPSINTECH_CONFIG_PATH")

    if [[ "$sandbox_use" == *"deerflow.community.aio_sandbox:AioSandboxProvider"* ]]; then
        if [ -n "$provisioner_url" ]; then
            echo "provisioner"
        else
            echo "aio"
        fi
    else
        echo "local"
    fi
}

# ── down ──────────────────────────────────────────────────────────────────────

if [ "$CMD" = "down" ]; then
    export OPSINTECH_HOME="${OPSINTECH_HOME:-$REPO_ROOT/backend/.opsintech}"
    export OPSINTECH_CONFIG_PATH="${OPSINTECH_CONFIG_PATH:-$OPSINTECH_HOME/config.yaml}"
    export OPSINTECH_DOCKER_SOCKET="${OPSINTECH_DOCKER_SOCKET:-/var/run/docker.sock}"
    export OPSINTECH_REPO_ROOT="${OPSINTECH_REPO_ROOT:-$REPO_ROOT}"
    export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-placeholder}"
    "${COMPOSE_CMD[@]}" down
    exit 0
fi

# ── Banner ────────────────────────────────────────────────────────────────────

echo "=========================================="
echo "  OpsinTech Platform Production Deployment"
echo "=========================================="
echo ""

# ── Step 1: Detect sandbox mode ──────────────────────────────────────────────

sandbox_mode="$(detect_sandbox_mode)"
echo -e "${BLUE}Sandbox mode: $sandbox_mode${NC}"

if [ "$sandbox_mode" = "provisioner" ]; then
    services=""
    extra_args="--profile provisioner"
else
    services="db-init frontend gateway langgraph nginx"
    extra_args=""
fi


# ── OPSINTECH_DOCKER_SOCKET ───────────────────────────────────────────────────

if [ -z "$OPSINTECH_DOCKER_SOCKET" ]; then
    export OPSINTECH_DOCKER_SOCKET="/var/run/docker.sock"
fi

if [ "$sandbox_mode" != "local" ]; then
    if [ ! -S "$OPSINTECH_DOCKER_SOCKET" ]; then
        echo -e "${RED}⚠ Docker socket not found at $OPSINTECH_DOCKER_SOCKET${NC}"
        echo "  AioSandboxProvider (DooD) will not work."
        exit 1
    else
        echo -e "${GREEN}✓ Docker socket: $OPSINTECH_DOCKER_SOCKET${NC}"
    fi
fi

echo ""

# ── Step 2: Build and start ───────────────────────────────────────────────────

echo "Building images and starting containers..."
echo ""

# shellcheck disable=SC2086
if [ "$NO_BUILD" = true ]; then
    "${COMPOSE_CMD[@]}" $extra_args up -d --remove-orphans $services
else
    "${COMPOSE_CMD[@]}" $extra_args up --build -d --remove-orphans $services
fi

echo ""
echo "=========================================="
echo "  OpsinTech Platform is running!"
echo "=========================================="
echo ""
echo "  🌐 Application: http://localhost:${PORT:-2026}"
echo "  📡 API Gateway: http://localhost:${PORT:-2026}/api/*"
echo "  🤖 LangGraph:   http://localhost:${PORT:-2026}/api/langgraph/*"
echo ""
echo "  Manage:"
echo "    ./scripts/deploy.sh down    — stop and remove containers"
echo "    docker compose -p opsintech logs -f — view logs"
echo ""
