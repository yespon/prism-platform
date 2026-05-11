# 快速开始指南

本指南帮助你在 5 分钟内从零开始与 OpsinTech 进行第一次 AI 对话。

[English](./QUICKSTART.md) | 中文

## 前提条件

- 已安装并运行 [Docker](https://docs.docker.com/get-docker/)
- 一个模型 API Key（OpenAI、Anthropic、DeepSeek 等）

## 第一步：克隆并启动

```bash
git clone https://github.com/opsintech/opsintech-platform.git
cd opsintech-platform
make config
make up
```

等待 30-60 秒所有服务启动完成，然后打开 http://localhost:2026。

> 也可以使用 `docker compose up -d` 启动，但 `make up` 会自动处理配置文件初始化和密钥生成。

## 第二步：登录

首次启动会自动创建初始管理员账户。打开登录页面后：
- 首次访问会自动跳转到 **初始化向导**，设置管理员邮箱和密码
- 设置完成后自动登录进入管理后台

## 第三步：通过管理后台添加模型

以平台管理员身份登录后，进入 **设置 → 模型管理**，从 20+ 预配置厂商模板中选择：

OpenAI · Anthropic · DeepSeek · Azure OpenAI · Gemini · Ollama · OpenRouter · Groq · Together AI · SiliconFlow · DashScope（百炼）· 智谱（GLM）· Moonshot（Kimi）· MiniMax · 百川 · 零一万物 · 火山方舟 · Novita AI · 以及任何 OpenAI 兼容厂商

选择厂商，填入 API Key——完成。模型配置会保存到数据库。

> 模型通过管理后台配置并存储在数据库中。

## 第四步：创建租户和用户

- 点击 **设置 → 租户管理**
- 点击 **创建租户**
- 填写租户名称（例如 "My Tenant"）
- 点击 **创建租户**，并设置默认租户管理员

> 每个租户可以有多个用户，每个用户可以有多个 Agent。

## 第五步：开始使用

- 点击侧边栏的 **智能工作台** 开始新对话
- 上传文件、提问、运行研究——Agent 在隔离沙箱中工作
- 查看 **智能体** 创建具有特定工具和行为的自定义 Agent
- 打开 **设置** 管理你的模型和工具

## 接下来可以做什么

- **添加更多模型**：进入 设置 → 模型管理，从 20+ 厂商模板中选择
- **连接 MCP 服务器**：通过 MCP 扩展 Agent 的自定义工具
- **添加自定义 Skill**：为你的工作流创建基于 Markdown 的 Skill 文件
- **邀请团队成员**：进入租户管理 → 成员管理（租户管理员可用）

---

## 常用命令

### Docker 生产部署

```bash
make up              # 构建镜像并启动全部服务（首次部署推荐）
make up-nobuild      # 使用已有镜像启动（不重新构建）
make down            # 停止并移除所有容器
make rebuild-images  # 删除所有 OpsinTech 镜像并重新构建
```

### 本地开发

```bash
make check           # 校验依赖环境（Node.js 22+、pnpm、uv、nginx）
make install         # 安装所有依赖（前端 + 后端）
make dev             # 启动开发服务器（支持热重载）
make stop            # 停止所有服务
make clean           # 清理进程和临时文件
```

### Docker 开发环境

```bash
make docker-init     # 拉取沙箱镜像
make docker-start    # 启动 Docker 开发服务
make docker-stop     # 停止 Docker 开发服务
make docker-logs     # 查看全部日志
make docker-logs-frontend  # 查看前端日志
make docker-logs-gateway   # 查看网关日志
```

### 其他命令

```bash
make config          # 生成本地配置文件（首次使用）
make config-upgrade  # 合并新配置字段到已有 config.yaml
make setup-sandbox   # 预拉取沙箱容器镜像
make help            # 查看所有可用命令
```

---

## 国内用户：本地构建镜像准备

在国内网络环境下，Docker 构建过程中需要从海外拉取基础镜像，可能会因网络问题导致构建失败。建议在构建前提前拉取以下镜像：

### 必需镜像

```bash
# 后端基础镜像
docker pull python:3.12-slim

# 前端基础镜像
docker pull node:22-alpine

# 反向代理
docker pull nginx:alpine

# Docker CLI（用于沙箱容器管理）
docker pull docker:cli
```

### 构建阶段依赖镜像

```bash
# uv 包管理器（后端构建时 COPY --from 引用）
docker pull ghcr.io/astral-sh/uv:0.9.26
```

### 可选镜像

```bash
# PostgreSQL（仅在使用 --profile postgres 时需要）
docker pull postgres:16-alpine

# 沙箱镜像（Docker 沙箱模式）
docker pull enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest
```

### 使用镜像加速

如果直接拉取 Docker Hub / GHCR 镜像速度较慢，可以配置 Docker 镜像加速器：

```bash
# 编辑 Docker daemon 配置
sudo vim /etc/docker/daemon.json
```

添加镜像源：

```json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
```

重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

配置完成后，即可正常执行 `make up` 构建和启动。

---

## 常见问题

**注册后出现 "No tenant assigned" 错误**
→ 重启后端服务。自动租户创建发生在首次 API 请求时。`docker compose restart gateway`

**沙箱启动失败**
→ 确保 Docker 正在运行且沙箱镜像已拉取：`make docker-init`

**模型返回错误**
→ 检查 API Key 是否正确，以及模型名称是否与厂商要求一致

**国内构建镜像超时**
→ 参照上方「国内用户：本地构建镜像准备」章节，提前拉取基础镜像或配置镜像加速器

**Hydration Error（浏览器控制台报错）**
→ 通常由浏览器扩展（如 Demoway）注入 HTML 属性导致，不影响功能使用，可忽略
