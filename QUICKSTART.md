# Quick Start Guide

[中文](./QUICKSTART_zh.md) | English

This guide gets you from zero to your first AI conversation with OpsinTech in under 5 minutes.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- A model API key (OpenAI, Anthropic, DeepSeek, etc.)

## Step 1: Clone and Start

```bash
git clone https://github.com/opsintech/opsintech-platform.git
cd opsintech-platform
make config
make up
```

Wait 30-60 seconds for all services to start, then open http://localhost:2026.

> You can also use `docker compose up -d`, but `make up` handles config initialization and secret generation automatically.

## Step 2: Log In

On first startup, a bootstrap admin account is created automatically. When you open the login page:
- You'll be redirected to the **Setup Wizard** to set your admin email and password
- After setup, you'll be automatically logged into the admin dashboard

## Step 3: Add Models via Admin UI

After logging in as platform admin, go to **Settings → Models** and pick from 20+ pre-configured provider templates:

OpenAI · Anthropic · DeepSeek · Azure OpenAI · Gemini · Ollama · OpenRouter · Groq · Together AI · SiliconFlow · DashScope · Zhipu (GLM) · Moonshot (Kimi) · MiniMax · Baichuan · 01.AI · Volcengine Ark · Novita AI · + any OpenAI-compatible provider

Select a provider, fill in your API key — done. The model is saved to the database.

> Models are configured via the admin UI and stored in the database. Do **not** edit `config.yaml` for model configuration in production.

## Step 4: Create Tenants and Users

- Go to **Settings → Tenant Management**
- Click **Create Tenant**
- Fill in the tenant name (e.g. "My Tenant")
- Click **Create Tenant** and set the default tenant admin

> Each tenant can have multiple users, and each user can have multiple Agents.

## Step 5: Start Using

- Click **Smart Workbench** in the sidebar to start a new conversation
- Upload files, ask questions, run research — the agent works inside an isolated sandbox
- Check **Agents** to create custom agents with specific tools and behaviors
- Open **Settings** to manage your models and tools

## What's Next

- **Add more models**: Go to Settings → Models and pick from 20+ provider templates
- **Connect MCP servers**: Extend the agent with custom tools via MCP
- **Add custom Skills**: Create Markdown-based skill files for your workflows
- **Invite team members**: Go to tenant admin → Members (available to tenant admins)

---

## Command Reference

### Docker Production

```bash
make up              # Build images and start all services (recommended for first deploy)
make up-nobuild      # Start services without rebuilding images
make down            # Stop and remove all containers
make rebuild-images  # Remove all OpsinTech images and rebuild from scratch
```

### Local Development

```bash
make check           # Verify prerequisites (Node.js 22+, pnpm, uv, nginx)
make install         # Install all dependencies (frontend + backend)
make dev             # Start development servers (with hot-reload)
make stop            # Stop all services
make clean           # Clean up processes and temporary files
```

### Docker Development

```bash
make docker-init     # Pull the sandbox container image
make docker-start    # Start Docker development services
make docker-stop     # Stop Docker development services
make docker-logs     # View all Docker logs
make docker-logs-frontend  # View frontend logs
make docker-logs-gateway   # View gateway logs
```

### Other Commands

```bash
make config          # Generate local config files (first-time setup)
make config-upgrade  # Merge new config fields into existing config.yaml
make setup-sandbox   # Pre-pull sandbox container image
make help            # Show all available commands
```

---

## China Users: Preparing Images for Local Builds

In China, pulling base images from overseas registries during Docker builds may fail due to network issues. Pre-pull the following images before building:

### Required Images

```bash
# Backend base image
docker pull python:3.12-slim

# Frontend base image
docker pull node:22-alpine

# Reverse proxy
docker pull nginx:alpine

# Docker CLI (for sandbox container management)
docker pull docker:cli
```

### Build-Stage Dependencies

```bash
# uv package manager (referenced via COPY --from in backend Dockerfile)
docker pull ghcr.io/astral-sh/uv:0.9.26
```

### Optional Images

```bash
# PostgreSQL (only needed with --profile postgres)
docker pull postgres:16-alpine

# Sandbox image (for Docker sandbox mode)
docker pull enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest
```

### Using a Mirror Accelerator

If pulling from Docker Hub / GHCR is slow, configure a Docker registry mirror:

```bash
# Edit Docker daemon config
sudo vim /etc/docker/daemon.json
```

Add mirror sources:

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
```

Restart Docker:

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

After configuration, run `make up` to build and start normally.

---

## Troubleshooting

**"No tenant assigned" error after registration**
→ Restart the backend service. The auto-tenant creation happens during the first API request. `docker compose restart gateway`

**Sandbox fails to start**
→ Make sure Docker is running and the sandbox image is pulled: `make docker-init`

**Model returns an error**
→ Verify your API key is correct and the model name matches what the provider expects

**Docker image build timeout in China**
→ See the "China Users" section above — pre-pull base images or configure a registry mirror

**Hydration Error in browser console**
→ Usually caused by browser extensions (e.g. Demoway) injecting HTML attributes. Safe to ignore
