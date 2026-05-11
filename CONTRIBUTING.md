# Contributing to OpsinTech

Thank you for your interest in contributing to OpsinTech! This guide will help you set up your development environment and understand our development workflow.

## Development Environment Setup

We offer two development environments. **Docker is recommended** for the most consistent and hassle-free experience.

### Option 1: Docker Development (Recommended)

Docker provides a consistent, isolated environment with all dependencies pre-configured. No need to install Node.js, Python, or nginx on your local machine.

#### Prerequisites

- Docker Desktop or Docker Engine
- pnpm (for caching optimization)

#### Setup Steps

1. **Configure the application**:
   ```bash
   make config

   export OPENAI_API_KEY="your-key-here"
   ```

2. **Initialize Docker environment** (first time only):
   ```bash
   make docker-init
   ```
   This will:
   - Build Docker images
   - Install frontend dependencies (pnpm)
   - Install backend dependencies (uv)
   - Share pnpm cache with host for faster builds

3. **Start development services**:
   ```bash
   make docker-start
   ```
   `make docker-start` reads `config.yaml` and starts `provisioner` only for provisioner/Kubernetes sandbox mode.

   All services will start with hot-reload enabled:
   - Frontend changes are automatically reloaded
   - Backend changes trigger automatic restart
   - LangGraph server supports hot-reload

4. **Access the application**:
   - Web Interface: http://localhost:2026
   - API Gateway: http://localhost:2026/api/*
   - LangGraph: http://localhost:2026/api/langgraph/*

#### Docker Commands

```bash
make docker-init             # Build images and initialize
make docker-start            # Start Docker services (mode-aware, localhost:2026)
make docker-stop             # Stop Docker development services
make docker-logs             # View Docker development logs
make docker-logs-frontend    # View Docker frontend logs
make docker-logs-gateway     # View Docker gateway logs
```

#### Linux: Docker daemon permission denied

If Docker-based commands fail on Linux with a permission error, your current user likely does not have permission to access the Docker daemon socket:

```text
unable to get image 'opsintech-dev-langgraph': permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

Recommended fix: add your current user to the `docker` group so Docker commands work without `sudo`.

1. Confirm the `docker` group exists:
   ```bash
   getent group docker
   ```
2. Add your current user to the `docker` group:
   ```bash
   sudo usermod -aG docker $USER
   ```
3. Apply the new group membership. The most reliable option is to log out completely and then log back in. If you want to refresh the current shell session instead, run:
   ```bash
   newgrp docker
   ```
4. Verify Docker access:
   ```bash
   docker ps
   ```
5. Retry the command:
   ```bash
   make docker-stop
   make docker-start
   ```

If `docker ps` still reports a permission error after `usermod`, fully log out and log back in before retrying.

#### Docker Architecture

```
Host Machine
  ↓
Docker Compose (opsintech-dev)
  ├→ nginx (port 2026) ← Reverse proxy
  ├→ web (port 3000) ← Frontend with hot-reload
  ├→ api (port 8001) ← Gateway API with hot-reload
  ├→ langgraph (port 2024) ← LangGraph server with hot-reload
  └→ provisioner (optional, port 8002) ← Started only in provisioner/K8s sandbox mode
```

**Benefits of Docker Development**:
- Consistent environment across different machines
- No need to install Node.js, Python, or nginx locally
- Isolated dependencies and services
- Easy cleanup and reset
- Hot-reload for all services
- Production-like environment

### Option 2: Local Development

If you prefer to run services directly on your machine:

#### Prerequisites

Check that you have all required tools installed:

```bash
make check
```

Required tools:
- Node.js 22+
- pnpm
- uv (Python package manager)
- nginx

#### Setup Steps

1. **Configure the application** (same as Docker setup above)

2. **Install dependencies**:
   ```bash
   make install
   ```

3. **Run development server** (starts all services with nginx):
   ```bash
   make dev
   ```

4. **Access the application**:
   - Web Interface: http://localhost:2026
   - All API requests are automatically proxied through nginx

#### Manual Service Control

If you need to start services individually:

1. **Start backend services**:
   ```bash
   # Terminal 1: Start LangGraph Server (port 2024)
   cd backend
   make dev

   # Terminal 2: Start Gateway API (port 8001)
   cd backend
   make gateway

   # Terminal 3: Start Frontend (port 3000)
   cd frontend
   pnpm dev
   ```

2. **Start nginx**:
   ```bash
   make nginx
   ```

3. **Access the application**:
   - Web Interface: http://localhost:2026

## Project Structure

```
opsintech-platform/
├── config.example.yaml               # Configuration template
├── Makefile                          # Build and development commands
├── scripts/
│   └── docker.sh                     # Docker management script
├── docker/
│   ├── docker-compose.yaml           # Docker Compose configuration
│   └── nginx/
│       ├── nginx.conf                # Nginx config for Docker
│       └── nginx.local.conf          # Nginx config for local dev
├── backend/                          # Backend application
│   ├── packages/
│   │   └── harness/
│   │       └── deerflow/
│   │           ├── agents/           # LangGraph agents
│   │           ├── tools/            # Built-in and MCP tools
│   │           ├── sandbox/          # Sandbox execution
│   │           └── memory/           # Memory system
│   ├── app/
│   │   └── gateway/                  # Gateway API (port 8001)
│   ├── docs/                         # Backend documentation
│   └── Makefile                      # Backend commands
├── frontend/                         # Frontend application
│   └── Makefile                      # Frontend commands
└── skills/                           # Agent skills
    ├── public/                       # Public skills
    └── custom/                       # Custom skills
```

## Architecture

```
Browser
  ↓
Nginx (port 2026) ← Unified entry point
  ├→ Frontend (port 3000) ← / (non-API requests)
  ├→ Gateway API (port 8001) ← /api/models, /api/mcp, /api/skills, /api/threads/*/artifacts
  └→ LangGraph Server (port 2024) ← /api/langgraph/* (agent interactions)
```

## Development Workflow

### For External Contributors (Fork)

If you don't have write access to the repository, contribute via a fork:

1. **Fork the repository**: Click the **Fork** button on GitHub to create your own copy.

2. **Clone your fork and set up upstream**:
   ```bash
   git clone git@github.com:YOUR_USERNAME/opsintech-platform.git
   cd opsintech-platform
   git remote add upstream git@github.com:OpsinTech/opsintech-platform.git
   ```

3. **Keep your fork in sync**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git push origin main
   ```

4. **Create a feature branch from upstream main**:
   ```bash
   git fetch upstream
   git checkout -b feature/your-feature-name upstream/main
   ```

5. **Make your changes** with hot-reload enabled

6. **Test your changes** thoroughly

7. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

8. **Push to your fork and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request from your fork's branch to `OpsinTech/opsintech-platform:main` on GitHub.

### For Team Members (Direct Access)

If you have write access to the repository:

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with hot-reload enabled

3. **Test your changes** thoroughly

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

5. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

| Prefix     | Usage                      |
|------------|----------------------------|
| `feat:`    | New feature                |
| `fix:`     | Bug fix                    |
| `refactor:`| Code restructuring         |
| `docs:`    | Documentation only         |
| `test:`    | Adding or updating tests   |
| `chore:`   | Maintenance tasks          |
| `ci:`      | CI/CD changes              |

## Testing

```bash
# Backend tests
cd backend
uv run pytest

# Frontend checks
cd frontend
pnpm check
```

## Code Style

- **Backend (Python)**: We use `ruff` for linting and formatting
- **Frontend (TypeScript)**: We use ESLint and Prettier

## Documentation

- [Configuration Guide](backend/docs/CONFIGURATION.md) - Setup and configuration
- [Architecture Overview](backend/docs/ARCHITECTURE.md) - Technical architecture
- [API Reference](backend/docs/API.md) - Complete API documentation

## Need Help?

- Check existing [Issues](https://github.com/opsintech/opsintech-platform/issues)
- Read the [Documentation](backend/docs/)

## License

By contributing to OpsinTech, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
