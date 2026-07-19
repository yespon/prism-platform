# Governed Agent Platform — Roadmap Design

**Date**: 2026-07-19
**Status**: Approved
**Authors**: yespon, Claude

---

## 1. Positioning & Principles

### 1.1 Platform Positioning

**Governed Agent Platform** — enabling any organization to securely create, deploy, and manage its own digital workforce.

### 1.2 Core Principles

| Principle | Description |
|-----------|-------------|
| **Governance First** | RBAC, audit, and model control are the platform foundation, not add-ons |
| **Plugin Architecture** | Vertical capabilities (ops, customer service, marketing) are pluggable "scenario packs"; the platform core remains generic |
| **Dual-Track Users** | Serves both bottom-up individual productivity and top-down enterprise provisioning |
| **Open Evolution** | From single-organization governance to cross-organization federation, gradually expanding trust boundaries |

### 1.3 Strategic Pivot

v1.1 is the "de-ops" transition release. v1.2–v1.3 build generic automation and ecosystem. v1.4–v1.5 complete enterprise integration. v2.0 achieves architectural leap.

---

## 2. Version Planning

### v1.1 — Platform Slimming & Repositioning (Transition Release)

| Scope | Content |
|-------|---------|
| Architecture Decoupling | Alerting pipeline, terminal governance, asset management → optional plugins (`plugins/ops-*`), disabled by default |
| Interface Definition | Plugin SPIs: `EventSource`, `Executor`, `Notifier` |
| Narrative Rewrite | README, website copy, release notes: "AI-Native Operations" → "Governed Agent Platform" |
| Compatibility Promise | Existing ops features preserved; manual enablement available; zero data migration cost |

### v1.2 — Generic Workflow Engine

| Scope | Content |
|-------|---------|
| Event Source Abstraction | Webhook / Scheduled / File change / Message queue (Kafka/RabbitMQ interface reserved) |
| Workflow Orchestration | DAG steps, conditional branches, parallel/serial, human approval nodes, retry/timeout |
| Executor Interface | Agent dialogue / Code sandbox / HTTP call / Terminal (as one plugin executor) |
| Audit Closure | Event → Workflow → Execution → Result, full-chain traceable and replayable |
| Built-in Templates | Scheduled reports, data sync, multi-Agent collaboration (e.g., "research → analyze → write" pipeline) |

### v1.3 — Digital Employee Framework

| Scope | Content |
|-------|---------|
| Custom Agent Enhancement | system_prompt templating (variable injection) + tool group whitelisting + skill binding + memory policy configuration |
| Agent Lifecycle | Draft → Sandbox test → Publish → Version management → Usage statistics → Retirement |
| Skill Marketplace Phase 1 | Git repository import + Official skill library + Tenant-internal sharing (no central server) |
| AI Analysis Workbench | Data connection (CSV/database/API) → Chart generation → Report/PPT export |
| Admin Perspective | Agent provisioning, usage statistics, cost control, permission approval |

### v1.4 — Integration & Openness

| Scope | Content |
|-------|---------|
| Open API | REST + Webhook: Agent dialogue, workflow trigger, result query; rate limiting, API key management |
| Third-Party Integration | Feishu/DingTalk/WeCom/Slack/Teams bidirectional (invoke Agent in IM, push results) |
| SSO/LDAP | Enterprise identity integration, auto-sync org structure to tenants/roles |
| Multi-Model Routing | Auto-select model by task type/cost/latency (e.g., "code task → DeepSeek, creative task → GPT-4") |

### v1.5 — Observability & Optimization

| Scope | Content |
|-------|---------|
| Agent Runtime Metrics | Success rate, latency, token consumption, user satisfaction (rating/feedback) |
| Workflow Analytics | Bottleneck identification, failure hotspots, optimization suggestions |
| A/B Testing | Compare different prompts/models/processes, data-driven iteration |
| Cost Attribution | Tenant/user/agent/workflow four-level cost allocation, budget alerts |

### v2.0 — Autonomous Runtime + Federated Ecosystem

| Scope | Content |
|-------|---------|
| Autonomous Agent Runtime | Replace DeerFlow dependency, full control of orchestration logic, state management, checkpoints |
| Central Skill Registry | Cross-tenant/cross-organization skill sharing and trading (npm-like, enterprise-grade permissions) |
| Agent Federation | Cross-organization Agent interoperability: discovery, authentication, permission boundaries, billing settlement, version compatibility |
| Low-Code Workflow Designer | Visual orchestration for non-technical users (drag-and-drop nodes, parameter configuration) |
| Edge Deployment | Lightweight runtime deployed to customer environments, data stays on-premises, cloud unified management |

---

## 3. Technical Architecture

### 3.1 Layered Architecture

```
┌─────────────────────────────────────────┐
│  Access Layer  │ Web Console │ Open API │ IM Bot │
├─────────────────────────────────────────┤
│  Core Layer    │ Agent Runtime │ Workflow Engine │
│                │ Skill System  │ Model Router   │
├─────────────────────────────────────────┤
│  Governance    │ RBAC │ Audit │ Cost │ Quota   │
├─────────────────────────────────────────┤
│  Plugin Layer  │ EventSource │ Executor │ Notifier │
│                │ [ops-alert] [ops-terminal] ... │
├─────────────────────────────────────────┤
│  Infrastructure│ DB │ Sandbox │ Storage │ MCP   │
└─────────────────────────────────────────┘
```

### 3.2 Agent Runtime vs Workflow Engine

**Coexistence, complementary relationship.**

| Aspect | Agent Runtime | Workflow Engine |
|--------|---------------|---------------|
| Role | "Employee" — single Agent's brain | "Project Manager" — cross-team orchestration |
| Duration | Minutes to hours | Hours to days |
| State | In-memory (LangGraph checkpoint) | Database persistent |
| Human Intervention | In-conversation | Async approval nodes |
| Audit | Single conversation | Full-chain, replayable |

**Technical Implementation**

```python
# Agent is an Executor node in Workflow definition
workflow = Workflow(
    name="daily-report",
    steps=[
        Step("fetch-data", executor=HTTPExecutor(url="...")),
        Step("analyze", executor=AgentExecutor(agent_id="data-analyst")),
        Step("generate-ppt", executor=AgentExecutor(agent_id="ppt-writer")),
        Step("send", executor=EmailExecutor(to="...")),
    ],
    triggers=[CronTrigger("0 9 * * *")]
)
```

### 3.3 Plugin Interface (v1.1 Definition)

```python
# Event source: generates workflow trigger signals
class EventSource(Protocol):
    async def subscribe(self, handler: EventHandler) -> None: ...
    async def health_check(self) -> HealthStatus: ...

# Executor: concrete action in workflow
class Executor(Protocol):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult: ...
    def capabilities(self) -> list[Capability]: ...

# Notifier: result push channel
class Notifier(Protocol):
    async def send(self, target: Target, content: Content) -> None: ...
```

### 3.4 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow engine implementation | Self-developed DAG scheduler, reuse LangGraph as Agent execution unit | Keep orchestration controllable, don't lock Agent internal implementation |
| Plugin isolation | Python namespace package + independent dependencies | Lightweight, compatible with existing uv workspace |
| Cross-organization federation protocol | OAuth2 + mTLS based REST, JSON Schema capability description | Standardized, easy multi-language implementation |

---

## 4. Risks & Migration

### 4.1 Main Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| v1.1 pluginization breaks existing ops features | Existing users lose functionality after upgrade | Plugins enabled by default (backward compatible); docs clarify "how to disable"; automated tests cover plugin toggle |
| Workflow engine and LangGraph state inconsistency | Agent executing when Workflow restarts, state lost | Workflow only stores "invocation handle"; Agent internal state managed by LangGraph; reschedule after restart |
| Federated ecosystem cross-org trust model complex | v2.0 delayed | v1.4 first implement "cross-tenant" federation (within same platform); v2.0 extend to "cross-platform"; protocol design reviewed by community in advance |
| Autonomous runtime replacement breaks DeerFlow ecosystem | Existing Skill/Agent incompatible | Maintain API compatibility layer; provide migration tools; LTS version maintained in parallel for 6 months |

### 4.2 Migration Path

```
v1.0 → v1.1: Zero migration, ops plugins enabled by default after upgrade, behavior unchanged
v1.1 → v1.2: New features, no migration; workflow engine optional enablement
v1.2 → v1.3: Custom Agent upgraded from "basic config" to "full framework", auto-migrate existing Agents
v1.3 → v1.4: Open API disabled by default, requires admin manual enablement and key configuration
v1.4 → v1.5: Observability data auto-collected, historical data not backfilled
v1.x → v2.0: Autonomous runtime deployed in parallel, grayscale migration; DeerFlow runtime marked deprecated
```

### 4.3 Success Metrics

| Version | Metric |
|---------|--------|
| v1.1 | Plugin toggle test pass rate 100%; README new version narrative published |
| v1.2 | 5 built-in workflow templates; engine handles 1000 concurrent workflows without failure |
| v1.3 | Official skill library 20+ skills; AI analysis workbench supports 3 data source types |
| v1.4 | Open API documentation complete; at least 1 IM integration launched |
| v1.5 | Cost attribution accuracy 95%+; A/B testing framework available |
| v2.0 | Federation protocol verified across 2 independent deployment instances |

---

## 5. Appendix

### 5.1 Terminology

| Term | Definition |
|------|------------|
| **Digital Employee** | A configured Agent with specific persona, skills, and tool access, serving as a virtual team member |
| **Scenario Pack** | A collection of plugins (EventSource + Executor + Notifier) for a specific vertical domain |
| **Federation** | Cross-organization Agent interoperability with mutual authentication, permission boundaries, and billing |
| **Executor** | A workflow node implementation that performs a concrete action (call Agent, execute code, send HTTP request, etc.) |

### 5.2 References

- Current README: `README.md`, `README_zh.md`
- Ops-vertical analysis: conversation history, 2026-07-19
- DeerFlow upstream: https://github.com/bytedance/deer-flow
