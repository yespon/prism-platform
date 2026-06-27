# Product Workspace 架构对齐与 MVP 落地方案

创建日期：2026-06-20  
所属目录：产品规划 / 版本管理  
规划主题：AI Product Workspace / 产品资产工作台 / 产品资产中台雏形  
适用范围：OpsinTech 平台的产品经理工作流、需求分析、PRD 生成、产品资产沉淀与后续产品中台演进

关联文档：

- [AI 产品经理工作台版本规划](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/产品规划/版本管理/2026-06-19_AI产品经理工作台版本规划.md)
- [AI 产品经理工作台整体架构设计](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/产品规划/版本管理/2026-06-19_AI产品经理工作台_整体架构设计.md)
- [产品资产智能工作台：设计规范与产品知识库方案](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/产品规划/版本管理/2026-06-19_产品资产智能工作台_设计规范与产品知识库方案.md)
- [用户与租户文件空间版本规划](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/产品规划/版本管理/2026-06-19_用户与租户文件空间版本规划.md)
- [pm-analysis Skill](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/skills/public/pm-analysis/SKILL.md)

---

## 1. 背景与核心问题

OpsinTech 当前已经具备 Agent、Skill、Workspace、Thread、Artifact、Upload、Tenant/User 等基础能力。

当前正在规划的 AI 产品经理工作台，长期方向接近“产品资产中台”：

- 管理产品空间；
- 管理 PRD、需求分析、用户故事、验收标准、页面结构等产品产物；
- 让 AI 基于产品资产、页面字典、业务对象、权限规则生成受约束的产品方案；
- 将 AI 输出从一次性聊天文本沉淀为可编辑、可版本化、可复用的产品资产。

但如果直接以“产品中台”的方式从零另起一套架构，会带来明显风险：

1. 与当前 Workspace 架构割裂；
2. 与现有 Agent / Skill 能力重复建设；
3. 与现有 Artifact 文件产物概念混淆；
4. 第一阶段范围过大，难以交付；
5. 容易把产品资产工作台误做成文件管理器。

因此，本方案的目标是明确：

> 不新建一套独立产品中台，而是在现有 OpsinTech 平台架构上，以 Product Workspace 的形式渐进式落地产品资产工作台。

---

## 2. 总体判断

### 2.1 方向正确，但切入点必须收敛

长期方向可以理解为产品资产中台，但第一阶段不应直接做完整中台。

第一阶段应该聚焦一个可验证闭环：

```text
产品经理输入需求想法
  ↓
AI 主动澄清
  ↓
生成结构化 PRD / 需求分析
  ↓
保存为 Product Artifact
  ↓
在 Product Workspace 中查看、编辑、复用
```

这个闭环解决的是产品经理的真实高频场景：

- 把模糊想法变成清晰需求；
- 把 AI 结果从聊天里沉淀出来；
- 让 PRD 和需求不再散落在临时文档和聊天记录里；
- 让后续 AI 可以复用历史产品资产。

### 2.2 第一阶段不是文件管理

Product Workspace 不应被设计成文件管理器。

文件管理器管理的是文件；Product Workspace 管理的是产品资产。

| 对比项 | 文件管理器 | Product Workspace |
| --- | --- | --- |
| 管理对象 | 文件、附件、图片、PDF、Markdown | PRD、需求分析、用户故事、页面结构、竞品报告、评审记录 |
| 核心问题 | 文件在哪里，谁能下载 | 这个产品决策是什么，属于哪个模块，影响哪些页面，当前状态如何 |
| 业务语义 | 弱 | 强 |
| AI 作用 | 读取文件内容 | 生成、修改、评审、复用产品产物 |
| 主要视图 | 文件夹、文件列表、预览 | 产品空间、产物列表、产物详情、来源引用、关联对象 |
| 生命周期 | 上传、下载、删除 | 草稿、评审、批准、归档、版本演进 |

正确关系是：

```text
文件 = 原材料
Product Artifact = 产品产物
Product Workspace = 管理产品产物和产品上下文的工作台
```

---

## 3. 与当前 OpsinTech 架构的对齐方式

### 3.1 当前可复用能力

当前平台已有能力如下：

```text
OpsinTech Platform
├── Workspace 页面体系
├── Agent / Skill 能力
├── Thread / Chat 会话能力
├── Artifact 文件产物访问能力
├── Upload / Asset 文件能力
├── Tenant / User 权限能力
├── Terminal Workspace
├── Agents Workspace
├── Skills Workspace
└── Alerting / Incident 等业务模块
```

Product Workspace 应该复用这些能力，而不是平行建设。

### 3.2 推荐新增位置

前端新增：

```text
frontend/src/app/workspace/product
```

后端新增：

```text
backend/app/models/product.py
backend/app/gateway/routers/products.py
```

Skill 升级：

```text
skills/public/pm-analysis/SKILL.md
```

### 3.3 不推荐的架构方式

不推荐新建独立模块：

```text
frontend/src/app/product-center
backend/app/product_center
```

原因：

- 容易和现有 Workspace 脱节；
- 容易形成第二套权限、导航和交互；
- 不利于后续复用 Agent / Skill / Thread 能力。

不推荐直接改造现有 `artifacts.py` 为产品资产系统。

当前 `artifacts.py` 负责 Thread Artifact 文件访问，Product Artifact 是业务资产，两者应该关联但不能混为一谈。

---

## 4. 核心概念定义

### 4.1 Product Workspace

Product Workspace 是产品经理进入的工作台入口。

它的职责是：

- 展示产品空间；
- 展示产品产物；
- 支持新建需求分析；
- 支持查看 PRD / 需求分析详情；
- 支持将 AI 生成结果保存为产品资产；
- 后续支持版本、评审、页面结构、任务拆解。

它不是文件空间，也不是通用网盘。

### 4.2 Product Space

Product Space 是产品上下文边界。

示例：

```text
智能终端
AI 产品经理工作台
智能告警
用户与租户文件空间
```

它解决的问题是：

> 当前需求属于哪个产品？AI 应该在哪个产品上下文里理解它？

### 4.3 Product Artifact

Product Artifact 是被沉淀下来的产品业务产物。

示例：

```text
PRD
需求分析
用户故事
验收标准
页面结构说明
竞品分析报告
Roadmap
评审记录
上线复盘
```

它解决的问题是：

> AI 生成的内容如何从一次性聊天文本变成长期可管理、可复用、可追踪的产品资产？

### 4.4 Thread Artifact 与 Product Artifact 的区别

| 对象 | 当前含义 | 生命周期 | 典型来源 | 是否有业务语义 |
| --- | --- | --- | --- | --- |
| Thread Artifact | 某次会话生成的文件 | 跟随会话 | AI 生成文件、上传输出 | 较弱 |
| Product Artifact | 产品业务资产 | 跟随产品空间长期存在 | PRD、需求、页面结构 | 强 |

推荐关系：

```text
AI 会话生成文件
  ↓
Thread Artifact 可预览 / 下载
  ↓
用户确认有价值
  ↓
保存为 Product Artifact
  ↓
Product Artifact 记录 source_thread_id / source_artifact_path
```

---

## 5. MVP 范围

### 5.1 MVP 目标

MVP 不追求完整产品中台，而是验证：

> 产品经理是否愿意使用 AI 完成需求分析，并将结果保存为可继续维护的产品资产。

### 5.2 MVP 必须包含

1. 升级 PM Skill 输出规范；
2. 新增 Product Workspace 页面；
3. 新增 ProductSpace / ProductArtifact 最小模型；
4. 新增最小 Product API；
5. 支持 AI 输出保存为 Product Artifact；
6. 用一个真实需求跑通闭环。

### 5.3 MVP 暂不包含

第一阶段不做：

- 完整文件管理器；
- 完整知识库 RAG；
- 向量检索；
- 多人实时协同；
- 完整版本 Diff；
- Figma / Axure 导入；
- 高保真原型编辑器；
- 自动创建研发任务；
- Jira / Linear / 飞书同步；
- 完整竞品持续监控。

---

## 6. Step 1：升级 PM Skill

### 6.1 Step 目标

让 AI 输出从“普通 Markdown 文档”升级为“可落库的结构化产品资产”。

当前 `pm-analysis` Skill 偏通用产品经理方法论，能生成专业 PRD，但缺少 OpsinTech 的产品资产约束。

Step 1 的目标是让 Skill 明确支持：

- Product Space；
- 关联模块；
- 关联页面；
- 业务对象；
- 权限规则；
- 来源引用；
- 待确认问题；
- Product Artifact JSON；
- PRD Markdown。

### 6.2 需要修改的文件

```text
skills/public/pm-analysis/SKILL.md
```

### 6.3 具体改动

新增一个“OpsinTech Product Asset Mode”。

当用户请求需求分析、PRD、页面结构、产品方案时，Skill 必须优先执行以下步骤：

```text
1. 判断或询问 Product Space
2. 判断相关模块
3. 判断是否影响已有页面
4. 判断涉及哪些业务对象
5. 判断是否涉及租户、权限、文件、Agent、终端、安全
6. 提出澄清问题
7. 生成 PRD Markdown
8. 生成 Product Artifact JSON
9. 标记来源引用和待确认项
```

### 6.4 推荐输出结构

Skill 输出不应只有 Markdown，还应包含结构化数据。

示例：

```json
{
  "product_space": "智能终端",
  "artifact_type": "prd",
  "title": "终端 Agent 任务模板功能 PRD",
  "status": "draft",
  "related_modules": ["终端 Agent", "权限管理"],
  "related_pages": ["/workspace/terminal"],
  "domain_objects": [
    "TerminalSession",
    "AgentTask",
    "CommandExecution"
  ],
  "permission_rules": [
    "private 模板仅创建人可见",
    "tenant 模板租户成员可使用",
    "admin 模板租户管理员可管理"
  ],
  "source_references": [
    "AI 产品经理工作台整体架构设计",
    "产品资产智能工作台：设计规范与产品知识库方案"
  ],
  "open_questions": [
    "是否允许租户管理员强制禁用某个模板？",
    "模板变量是否需要支持敏感字段脱敏？"
  ],
  "content_markdown": "# 终端 Agent 任务模板功能 PRD\n...",
  "content_json": {
    "background": "...",
    "goals": [],
    "non_goals": [],
    "user_stories": [],
    "acceptance_criteria": [],
    "risks": []
  }
}
```

### 6.5 验收标准

- AI 不再直接输出泛泛 PRD；
- AI 能主动询问 Product Space 或根据上下文推断；
- AI 能明确区分已知事实和待确认内容；
- AI 输出能被保存为 Product Artifact；
- AI 方案能体现 OpsinTech 的租户、权限、Agent、终端等约束。

---

## 7. Step 2：新增 Product Workspace 页面

### 7.1 Step 目标

新增一个产品经理可进入的工作台页面，用来查看和管理产品资产。

它不是文件管理器。

它的核心对象是：

```text
Product Space
Product Artifact
```

### 7.2 页面位置

推荐新增：

```text
frontend/src/app/workspace/product
```

### 7.3 页面信息架构

第一版页面建议：

```text
Product Workspace
├── 左侧：Product Space 列表
│   ├── 智能终端
│   ├── AI 产品经理工作台
│   ├── 智能告警
│   └── 文件空间
│
├── 中间：Product Artifact 列表
│   ├── PRD
│   ├── 需求分析
│   ├── 用户故事
│   ├── 页面结构
│   └── 竞品报告
│
└── 右侧 / 详情页：产物详情
    ├── Markdown 内容
    ├── 结构化字段
    ├── 来源引用
    ├── 待确认问题
    ├── 关联模块 / 页面 / 对象
    └── 状态 / 编辑 / 保存
```

### 7.4 第一版用户操作

第一版需要支持以下操作：

#### 7.4.1 查看 Product Space

用户可以看到产品空间列表，例如：

```text
智能终端
AI 产品经理工作台
智能告警
用户与租户文件空间
```

#### 7.4.2 查看 Product Artifact 列表

用户选择某个 Product Space 后，可以查看该空间下的产物：

```text
终端 Agent 任务模板功能 PRD
终端命令审批优化需求分析
终端会话历史保存方案
终端 Agent 页面结构说明
```

#### 7.4.3 新建需求分析

用户点击“新建需求分析”，输入一句需求想法：

```text
我想做一个终端 Agent 任务模板功能，让用户可以保存常用命令。
```

系统进入 AI 生成流程。

#### 7.4.4 查看产物详情

产物详情应展示：

- 标题；
- 类型；
- 状态；
- 所属 Product Space；
- 关联模块；
- 关联页面；
- 业务对象；
- 权限规则；
- Markdown 正文；
- 来源引用；
- 待确认问题。

#### 7.4.5 保存 AI 结果为 Product Artifact

AI 输出结果后，用户可以点击：

```text
保存为产品产物
```

系统保存为 Product Artifact。

### 7.5 第一版不做什么

Step 2 第一版不做：

- 文件夹树；
- 文件上传管理；
- 文件预览器；
- 类网盘交互；
- 多人实时编辑；
- 完整文档编辑器；
- 复杂版本对比；
- 高保真原型编辑。

### 7.6 验收标准

- 用户可以进入 Product Workspace；
- 用户能看到 Product Space；
- 用户能看到 Product Artifact 列表；
- 用户能打开一个 Product Artifact；
- 页面表达的是产品资产，而不是文件列表；
- 用户能从该页面发起新需求分析。

---

## 8. Step 3：新增最小后端模型和 API

### 8.1 Step 目标

让 Product Workspace 能真正保存和读取产品资产。

第一版只新增两个核心对象：

```text
ProductSpace
ProductArtifact
```

### 8.2 推荐新增文件

```text
backend/app/models/product.py
backend/app/gateway/routers/products.py
```

### 8.3 ProductSpace 模型

最小字段：

```text
product_spaces
  id
  tenant_id
  name
  description
  status: active | archived
  created_by
  created_at
  updated_at
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| id | 产品空间 ID |
| tenant_id | 租户隔离字段 |
| name | 产品空间名称 |
| description | 产品空间说明 |
| status | active / archived |
| created_by | 创建人 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### 8.4 ProductArtifact 模型

最小字段：

```text
product_artifacts
  id
  tenant_id
  product_space_id
  type
  title
  status: draft | reviewing | approved | archived
  content_markdown
  content_json
  source_thread_id
  source_artifact_path
  created_by
  updated_by
  created_at
  updated_at
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| id | 产品产物 ID |
| tenant_id | 租户隔离字段 |
| product_space_id | 所属产品空间 |
| type | prd / requirement / user_story / prototype_spec / competitor_report |
| title | 产物标题 |
| status | draft / reviewing / approved / archived |
| content_markdown | 用于阅读和编辑的 Markdown 内容 |
| content_json | 用于结构化解析、版本 diff、AI 复用的 JSON 内容 |
| source_thread_id | 来源会话 ID |
| source_artifact_path | 来源会话文件路径 |
| created_by | 创建人 |
| updated_by | 更新人 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### 8.5 第一版 API

推荐新增：

```text
GET    /api/products/spaces
POST   /api/products/spaces
GET    /api/products/artifacts
POST   /api/products/artifacts
GET    /api/products/artifacts/{id}
PATCH  /api/products/artifacts/{id}
```

### 8.6 API 行为说明

#### GET /api/products/spaces

返回当前租户可见的产品空间。

#### POST /api/products/spaces

创建产品空间。

第一版可以仅支持租户内可见，不做复杂成员权限。

#### GET /api/products/artifacts

按 Product Space 查询产物列表。

推荐查询参数：

```text
product_space_id
artifact_type
status
keyword
```

#### POST /api/products/artifacts

保存一个产品产物。

典型场景：

```text
AI 输出 PRD
  ↓
用户点击保存
  ↓
创建 ProductArtifact
```

#### GET /api/products/artifacts/{id}

查看产物详情。

#### PATCH /api/products/artifacts/{id}

更新标题、状态、Markdown 内容、JSON 内容等。

### 8.7 租户权限原则

所有 ProductSpace 和 ProductArtifact 必须带 `tenant_id`。

查询时必须按当前租户过滤：

```text
WHERE tenant_id = current_tenant_id
```

第一版暂不做复杂空间成员权限，避免范围扩大。

### 8.8 验收标准

- 能创建 Product Space；
- 能创建 Product Artifact；
- 能按租户隔离查询；
- 能按产品空间查询产物；
- 能保存 Markdown + JSON；
- 能记录来源 thread 和 artifact path。

---

## 9. Step 4：接入 AI 生成闭环

### 9.1 Step 目标

把 AI 需求分析能力接入 Product Workspace，让用户可以完成完整工作流。

完整流程：

```text
用户进入 Product Workspace
  ↓
选择 Product Space
  ↓
点击新建需求分析
  ↓
输入一句需求
  ↓
选择或默认使用 pm-analysis Skill
  ↓
AI 提出澄清问题
  ↓
用户补充回答
  ↓
AI 生成 PRD Markdown + Product Artifact JSON
  ↓
用户预览
  ↓
点击保存为产品产物
  ↓
ProductArtifact 入库
```

### 9.2 第一版实现策略

第一版不重构 Agent Runtime。

推荐先复用现有 Chat / Agent / Skill 能力：

```text
Product Workspace
  ↓
调用现有 AI 会话能力
  ↓
使用 pm-analysis Skill
  ↓
获得 AI 输出
  ↓
用户确认
  ↓
调用 /api/products/artifacts 保存
```

### 9.3 AI 输出处理方式

AI 输出需要分成两部分：

1. 面向用户阅读的 Markdown；
2. 面向系统保存的 JSON。

如果第一版无法稳定自动解析 JSON，可以采用过渡方案：

```text
AI 输出 Markdown
  ↓
前端提供“保存为产品产物”表单
  ↓
用户确认标题、类型、Product Space
  ↓
系统把 Markdown 保存到 content_markdown
  ↓
content_json 先保存基础元数据
```

后续再提升 JSON 解析稳定性。

### 9.4 验收标准

- 用户能从 Product Workspace 发起 AI 需求分析；
- AI 能基于 Product Space 生成内容；
- 用户能预览 AI 输出；
- 用户能保存为 Product Artifact；
- 保存后能在 Product Artifact 列表看到；
- 再次打开能查看完整内容。

---

## 10. Step 5：用真实需求验证闭环

### 10.1 推荐验证需求

建议使用：

```text
终端 Agent 任务模板功能
```

原因：

- 与当前已有 Terminal Workspace 强相关；
- 涉及 Agent、命令、安全审批、权限；
- 能体现产品资产约束；
- 能验证 PRD、页面结构、验收标准是否贴合真实产品；
- 能验证 Product Workspace 是否比普通聊天更有沉淀价值。

### 10.2 验证流程

```text
1. 创建 Product Space：智能终端
2. 输入需求：我想做终端 Agent 任务模板功能
3. AI 提出澄清问题
4. 用户补充回答
5. AI 生成 PRD
6. AI 标注相关页面：/workspace/terminal
7. AI 标注相关对象：TerminalSession / AgentTask / CommandExecution
8. AI 标注权限规则和安全审批风险
9. 用户保存为 Product Artifact
10. 在 Product Workspace 查看该 PRD
```

### 10.3 验证指标

| 指标 | 目标 |
| --- | --- |
| 从想法到 PRD 草稿时间 | 小于 5 分钟 |
| AI 澄清问题数量 | 至少 5 个关键问题 |
| PRD 是否贴合现有产品 | 是 |
| 是否明确关联页面 | 是 |
| 是否明确权限和安全边界 | 是 |
| 是否可保存为产品资产 | 是 |
| 用户是否愿意继续编辑 | 是 |

---

## 11. Product Workspace 与文件空间的关系

### 11.1 文件空间的职责

文件空间负责：

- 上传文件；
- 存储附件；
- 管理用户文件；
- 管理租户文件；
- 文件预览；
- 文件权限；
- 文件下载。

### 11.2 Product Workspace 的职责

Product Workspace 负责：

- 产品空间；
- 产品产物；
- PRD；
- 需求分析；
- 用户故事；
- 验收标准；
- 页面结构；
- 竞品报告；
- 产品决策；
- AI 生成与复用。

### 11.3 两者关系

文件可以作为 Product Artifact 的来源或附件。

示例：

```text
用户上传客户反馈.xlsx
  ↓
文件空间保存文件
  ↓
Product Workspace 选择该文件作为上下文
  ↓
AI 生成需求分析
  ↓
保存为 Product Artifact
```

不要把 Product Workspace 做成文件空间的换皮页面。

---

## 12. Product Workspace 与 Artifact 文件访问的关系

当前平台已有 Thread Artifact 文件访问能力。

它负责：

```text
/api/threads/{thread_id}/artifacts/{path}
```

这个能力继续保留，Product Workspace 不应该替代它。

推荐关系：

```text
Thread Artifact
  负责文件访问、预览、下载

Product Artifact
  负责产品业务语义、状态、关联、长期管理
```

Product Artifact 可以引用 Thread Artifact：

```text
source_thread_id
source_artifact_path
```

这样既复用现有能力，又不混淆职责。

---

## 13. 第一阶段页面原型说明

### 13.1 页面布局

```text
┌──────────────────────────────────────────────────────────────┐
│ Product Workspace                           新建需求分析      │
├───────────────┬────────────────────────┬─────────────────────┤
│ Product Space │ Product Artifact List  │ Artifact Detail     │
│               │                        │                     │
│ 智能终端       │ 任务模板功能 PRD        │ 标题 / 状态          │
│ AI产品工作台   │ 命令审批优化需求        │ 关联模块             │
│ 智能告警       │ 会话历史保存方案        │ 关联页面             │
│ 文件空间       │                        │ Markdown 内容        │
│               │                        │ 来源 / 待确认问题    │
└───────────────┴────────────────────────┴─────────────────────┘
```

### 13.2 列表字段

Product Artifact 列表建议字段：

```text
标题
类型
状态
更新时间
创建人
关联模块
```

### 13.3 详情字段

详情页建议字段：

```text
标题
类型
状态
所属 Product Space
关联模块
关联页面
业务对象
权限规则
来源引用
待确认问题
Markdown 正文
```

---

## 14. 数据流设计

### 14.1 新建需求分析数据流

```text
用户输入需求
  ↓
前端 Product Workspace 收集 product_space_id
  ↓
调用现有 AI / Skill 流程
  ↓
pm-analysis Skill 生成 Markdown + JSON
  ↓
前端展示预览
  ↓
用户点击保存
  ↓
POST /api/products/artifacts
  ↓
ProductArtifact 入库
  ↓
列表刷新
```

### 14.2 查看产物数据流

```text
用户选择 Product Space
  ↓
GET /api/products/artifacts?product_space_id=xxx
  ↓
展示产物列表
  ↓
用户点击某个产物
  ↓
GET /api/products/artifacts/{id}
  ↓
展示详情
```

### 14.3 更新产物数据流

```text
用户编辑标题 / Markdown / 状态
  ↓
PATCH /api/products/artifacts/{id}
  ↓
后端更新 updated_by / updated_at
  ↓
返回最新产物
```

---

## 15. 后续演进路线

### V0.1：产品资产 MVP

- 升级 pm-analysis Skill；
- 新增 Product Workspace；
- 新增 ProductSpace / ProductArtifact；
- 支持保存 PRD；
- 用终端任务模板验证闭环。

### V0.2：上下文选择增强

- 支持选择相关文件；
- 支持选择历史 Product Artifact；
- 支持选择产品规划文档；
- AI 输出标注来源引用。

### V0.3：版本和评审

- ProductArtifactVersion；
- 简单版本记录；
- 评论和待确认问题；
- 评审状态流转。

### V0.4：页面结构模型

- 结构化页面模型；
- 页面清单；
- 字段定义；
- 状态和异常；
- 权限差异；
- 低保真预览。

### V0.5：产品知识库半自动化

- 从前端路由抽取页面；
- 从组件目录抽取组件；
- 从后端模型抽取业务对象；
- 从权限代码抽取权限规则。

### V0.6：研发交付衔接

- PRD 转任务拆解；
- PRD 转测试用例；
- 页面结构转开发任务；
- 后续集成 GitHub Issues / Jira / Linear。

---

## 16. 风险与规避

### 16.1 风险：范围变成完整产品中台

表现：

- 一开始就做复杂权限；
- 一开始就做完整知识库；
- 一开始就做原型编辑器；
- 一开始就做项目管理。

规避：

- V0.1 只做需求分析到 Product Artifact 保存；
- 不做复杂版本；
- 不做复杂 RAG；
- 不做高保真原型。

### 16.2 风险：误做成文件管理器

表现：

- 页面主要展示文件夹；
- 用户核心操作是上传、下载、预览文件；
- PRD 只是文件。

规避：

- 页面核心对象必须是 Product Space 和 Product Artifact；
- 文件只作为来源或附件；
- Product Artifact 必须有类型、状态、关联模块、业务对象等产品语义。

### 16.3 风险：AI 输出仍然泛化

表现：

- PRD 看起来完整，但不贴合 OpsinTech；
- 没有关联页面；
- 没有权限规则；
- 没有业务对象；
- 没有待确认问题。

规避：

- 先升级 pm-analysis Skill；
- 强制输出 Product Artifact JSON；
- 强制标注相关模块、页面、对象、权限；
- 对无依据内容标记待确认。

### 16.4 风险：与现有 Artifact 概念混淆

表现：

- 把 `artifacts.py` 扩展成产品资产管理；
- Thread 文件和 PRD 业务资产混在一起。

规避：

- Thread Artifact 继续负责文件访问；
- Product Artifact 新增独立业务模型；
- 通过 `source_thread_id` 和 `source_artifact_path` 建立关联。

---

## 17. 推荐实施清单

### 17.1 第一优先级

```text
1. 修改 pm-analysis Skill
2. 新增 ProductSpace / ProductArtifact 模型
3. 新增 products.py API
4. 新增 Product Workspace 页面
5. 跑通终端 Agent 任务模板需求验证
```

### 17.2 第二优先级

```text
1. 支持从现有文档选择上下文
2. 支持 Product Artifact 简单编辑
3. 支持待确认问题管理
4. 支持来源引用展示
```

### 17.3 第三优先级

```text
1. Artifact 版本记录
2. 页面结构模型
3. 评审流程
4. 研发任务拆解
```

---

## 18. 与当前已实现功能的功能层级关系

### 18.1 总体结论

Product Workspace 不是替代当前已有能力，也不是在当前平台旁边再建一套“产品中台”。

更准确的层级关系是：

```text
OpsinTech Platform
├── L0 基础平台层
│   ├── Tenant / User / Auth / Admin
│   ├── Gateway / DB / Migration / Audit
│   └── 配置、权限、安全、健康检查
│
├── L1 运行时与会话层
│   ├── Thread / Chat
│   ├── Agent / Skill
│   ├── Tool / MCP
│   └── Terminal Agent Runtime
│
├── L2 文件与执行资产层
│   ├── Thread Uploads
│   ├── Thread Artifacts
│   ├── SSH Local Assets
│   └── Keychain / Asset Group
│
├── L3 业务工作台层（按租户 / 用户能力动态裁剪）
│   ├── Common Workspace Modules
│   │   ├── Overview / Chats
│   │   ├── Agents / Skills
│   │   └── Announcements
│   ├── Ops Workspace
│   │   ├── Terminal Workspace
│   │   ├── Alerting / Incident Workspace
│   │   ├── Execution Assets / Keychain
│   │   └── Diagnosis / Runbook
│   ├── Product Workspace  ← 新增
│   │   ├── Product Studio（原“智能工作台”，建议后续重命名）
│   │   ├── Product Spaces
│   │   ├── Product Artifacts
│   │   └── Product Context
│   └── Dev Workspace  ← 远期预留，不进入当前 MVP
│       ├── Code Plugin / IDE Extension
│       ├── Repo Context
│       └── Coding Agent Runtime
│
└── L4 业务语义资产层
    ├── Product Space
    ├── Product Artifact
    ├── Product Context
    ├── Product Review
    ├── Product Delivery
    ├── Dev Repo Context
    └── Code Change Proposal
```

因此，Product Workspace 的定位是：

> 在现有平台的 Workspace 体系内，新增一个面向产品经理的业务工作台；
> 它向下复用现有文件、会话、Skill、Agent 和权限能力，向上沉淀产品语义资产。

---

### 18.2 当前已有功能与 Product Workspace 的对应关系

| 当前已实现能力 | 当前职责 | 工作台归属判断 | Product Workspace 如何复用 |
| --- | --- | --- | --- |
| Tenant / User / Auth | 多租户、用户身份、接口鉴权 | 平台基础层 | ProductSpace / ProductArtifact 必须带 `tenant_id`，按当前用户权限过滤 |
| Admin / Audit | 管理员治理、审计记录 | 管理工作台 / 平台治理层 | 保存、发布、删除产品资产时记录审计事件 |
| Thread / Chat | 一次会话过程、上下文对话 | 通用运行时；当前 UI 可作为“智能工作台”的底座 | 产品侧可重命名为 Product Studio / 需求创作台，用于 AI 需求分析和 PRD 生成 |
| Skill | AI 能力说明和方法论 | 通用能力层 | 升级 `pm-analysis`，让其输出结构化产品资产 |
| Agent / Tool / MCP | AI 执行、工具调用、外部能力 | 通用能力层 | 后续 Product Agent 可复用工具和图执行能力 |
| Uploads | 会话内用户上传文件 | 通用文件能力 | 用户上传的资料作为 Product Context 来源 |
| Thread Artifacts | 会话内 AI 生成文件的访问、预览、下载 | 通用文件能力 | Product Artifact 可引用 `source_thread_id` / `source_artifact_path` |
| Local Assets / Keychain | SSH 主机、凭据、资产分组 | 运维工作台 | 与 Product Workspace 无直接同层关系，只在终端类需求中作为业务对象引用 |
| Terminal Workspace | 终端执行、命令审批、主机连接 | 运维工作台 | 可作为验证 Product Workspace 的真实产品空间 |
| Alerting / Incident | 告警源、事件、通知、处置 | 运维工作台 | 可作为另一个产品空间，沉淀告警模块 PRD 和版本规划 |
| Skills Workspace | Skill 管理和启用 | 通用能力管理；普通用户可弱化入口 | Product Workspace 调用已启用 PM Skill，而不是内置死逻辑 |

当前判断：现有已经产品化的业务闭环，主要都属于 **Ops Workspace（运维工作台）**；“智能工作台”本质上是 AI 会话 / 生成 / 资产沉淀入口，后续不宜继续作为一个含义过宽的独立工作台，而应该按场景拆入 Product Workspace，命名为 Product Studio、产品创作台或需求工作台。

---

### 18.3 三类“资产”必须分清

当前代码里已经存在 `assets` 相关模型和 API，例如：

- [assets.py](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/backend/app/models/assets.py)
- [assets.py](file:///Users/kevinliangx/Developer/Repos/PublicCodeHub/KevinLiangX/opsintech/opsintech-platform/backend/app/gateway/routers/assets.py)

这些 `Asset` 当前指的是运维执行侧资产，不是产品经理工作台里的产品资产。

建议明确区分三类资产：

| 资产类型 | 英文命名建议 | 当前/新增 | 管理对象 | 典型 API / 表 |
| --- | --- | --- | --- | --- |
| 执行资产 | Execution Asset / Local Asset | 已有 | SSH 主机、凭据、主机分组 | `local_assets`、`keychains`、`asset_groups`、`/api/v1/assets` |
| 文件资产 | File / Upload / Thread Artifact | 已有 | 上传文件、AI 生成文件、附件 | `/api/threads/{thread_id}/uploads`、`/api/threads/{thread_id}/artifacts` |
| 产品资产 | Product Artifact / Product Context Asset | 新增 | PRD、需求分析、页面结构、竞品报告、评审记录 | `product_artifacts`、`product_spaces`、`/api/products/*` |

关键原则：

```text
不要把 Product Artifact 命名成通用 Asset
不要复用 backend/app/models/assets.py 放产品资产
不要把 /api/v1/assets 扩展成产品资产 API
```

推荐命名：

```text
backend/app/models/product.py
backend/app/gateway/routers/products.py

ProductSpace
ProductArtifact
ProductContextSource
ProductArtifactLink
```

如果后续要做“Asset Registry”，建议命名为：

```text
ProductContextRegistry
ProductContextSourceRegistry
```

不要叫通用的 `AssetRegistry`，避免和当前 SSH / Keychain 资产体系冲突。

---

### 18.4 文件、Artifact、Product Artifact 的边界

当前平台已经有两类与文件有关的能力：

1. Uploads：用户上传到某个 Thread 的文件；
2. Thread Artifacts：AI 在某个 Thread 中生成的文件。

Product Workspace 不应该移动这些文件，也不应该重写文件存储层。

推荐关系：

```text
用户上传资料
  ↓
Uploads 保存到 Thread 文件空间
  ↓
Product Workspace 选择该文件作为上下文来源
  ↓
AI 生成 PRD / 需求分析
  ↓
Thread Artifact 可作为生成过程中的文件输出
  ↓
用户确认后保存为 Product Artifact
  ↓
Product Artifact 记录来源引用和业务语义
```

也就是说：

| 层级 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| Uploads | 保存用户上传的原始文件 | 判断文件对应哪个产品决策 |
| Thread Artifacts | 访问 AI 生成的文件 | 管理 PRD 状态、评审、版本 |
| Product Artifact | 管理产品业务产物 | 直接承担底层文件存储和下载 |
| Product Context | 把文件和产物转为 AI 可用上下文 | 做成网盘式文件夹系统 |

第一阶段只需要做到：

```text
ProductArtifact.source_thread_id
ProductArtifact.source_artifact_path
ProductArtifact.source_references
```

不需要一开始建设完整文件中台。

---

### 18.5 Product Workspace 在现有 Workspace 中的位置

当前平台已有多个 Workspace 型功能。Product Workspace 应该和 Ops Workspace、Common Workspace Modules 平级，而不是在它们之上另建系统。

推荐前端层级从“功能平铺”调整为“按业务工作台分组”：

```text
/workspace
├── overview                 通用：概览
├── chats                    通用：AI 会话
├── agents                   通用：智能体管理
├── skills                   通用：技能管理
│
├── ops                      运维工作台
│   ├── terminal             已有：终端智能工作台
│   ├── alerting             已有或规划中：告警 / 事件
│   ├── assets               已有：执行资产 / 主机 / 分组
│   └── keychain             已有：凭据和密钥
│
├── product                  新增：产品工作台
│   ├── studio               原“智能工作台”产品侧重命名：产品创作台 / Product Studio
│   ├── spaces               产品空间
│   ├── artifacts            产品资产
│   └── context              产品上下文
│
└── dev                      远期：研发工作台，不进入当前 MVP
    ├── code-plugin          参考 opencode / Codex 的代码开发插件
    ├── repo-context         代码仓库上下文
    └── change-proposals     代码修改建议
```

Product Workspace 的页面不应该首先展示文件夹，而应该展示：

```text
Product Workspace
├── Product Spaces
│   ├── 智能终端
│   ├── 智能告警
│   ├── AI 产品经理工作台
│   └── 文件空间
│
├── Product Artifacts
│   ├── PRD
│   ├── 需求分析
│   ├── 页面结构
│   ├── 竞品报告
│   └── 评审记录
│
└── Product Context
    ├── 已选文件
    ├── 已选历史产物
    ├── 相关页面
    ├── 相关业务对象
    └── 相关权限规则
```

这样它和现有功能的关系会更清楚：

- `ops/terminal`、`ops/alerting`、`ops/assets`、`ops/keychain` 是运维工作台内容；
- `skills` 是 AI 能力管理，不直接代表某个业务部门；
- `agents` 是智能体配置，不直接代表某个业务部门；
- `uploads/artifacts` 是文件和会话产物能力；
- `product/studio` 是产品侧 AI 创作入口，承接原“智能工作台”的产品化形态；
- `product/spaces`、`product/artifacts`、`product/context` 是产品语义资产工作台；
- `dev` 是远期研发工作台，只做轻量代码插件和模型调用入口，不在当前阶段扩展为完整研发管理平台。

#### 18.5.1 业务工作台按租户和用户动态可见

不同租户进入 OpsinTech 后，不应该看到完全相同的业务工作台。

平台底层已经通过 Tenant / User / Role / Permission 区分用户身份，因此业务工作台层也应该延续这个原则：

```text
用户登录
  ↓
确定当前 tenant_id / user_id / role / enabled_capabilities
  ↓
返回当前租户和当前用户可见的 Workspace Modules
  ↓
前端只展示该用户有意义、有权限、有业务场景的工作台
```

推荐把工作台分为三类：

| 工作台类型 | 示例 | 可见性原则 | 产品判断 |
| --- | --- | --- | --- |
| 通用工作台 | Overview、Chats、Agents、Skills、Announcements | 默认可对大多数租户开放，再按角色裁剪管理入口 | 平台基础能力，适合作为共同底座 |
| 运维工作台 | Terminal、Alerting / Incident、Execution Assets、Keychain | 只对启用了运维能力的租户或用户展示 | 运维是运维，不应强行展示给纯产品团队 |
| 产品工作台 | Product Workspace、Product Space、Product Artifact | 只对启用了产品资产能力的租户或用户展示 | 产品是产品，应围绕 PRD、需求、评审和产品上下文展开 |
| 管理工作台 | Admin、Audit、Security、Tenant Settings | 只对平台管理员或租户管理员展示 | 治理能力按角色开放，不进入普通业务用户主流程 |

关键原则：

```text
不是所有租户都需要运维工作台
不是所有租户都需要产品工作台
通用能力可以默认展示
专业业务能力必须按租户开关和用户权限展示
```

因此，Workspace 导航不应该是静态菜单，而应该来自当前租户的能力配置：

```text
Tenant.enabled_workspaces = [
  "overview",
  "chats",
  "agents",
  "skills",
  "product"
]

User.permissions = [
  "workspace.product.read",
  "workspace.product.write"
]
```

对于不同类型租户，可以形成不同默认组合：

| 租户类型 | 默认可见工作台 | 不默认展示 |
| --- | --- | --- |
| 产品团队租户 | Overview、Chats、Agents、Skills、Product Workspace | Terminal、Alerting、Keychain |
| 运维团队租户 | Overview、Chats、Agents、Skills、Terminal、Alerting | Product Workspace |
| 综合平台租户 | Overview、Chats、Agents、Skills、Terminal、Alerting、Product Workspace | 仅按角色隐藏 Admin / Security |
| 普通业务租户 | Overview、Chats、Announcements、必要业务工作台 | Terminal、Keychain、Admin |

这也符合当前产品判断：

> 智能告警和智能终端只需要形成运维闭环，不需要继续扩成通用运维产品；Product Workspace 则面向产品资产闭环。两者都属于业务工作台，但面向的租户和用户不同。

MVP 阶段可以先不建设复杂的商业化套餐系统，只需要在后端返回当前用户可见的 workspace modules，前端导航按返回结果渲染即可。

#### 18.5.2 当前工作台重组判断：运维 / 产品 / 研发

从产品定位看，当前已经实现并且有明确业务闭环的能力，主要属于运维工作台：

```text
Ops Workspace
├── 智能终端：连接主机、执行命令、审批、输出解释
├── 智能告警：告警接入、事件聚合、诊断、通知、处置建议
├── 执行资产：主机、资产分组、凭据、Keychain
└── 运维闭环：发现问题 → 诊断问题 → 执行动作 → 记录结果
```

这些能力不应该继续扩成“大而全的运维产品”，只要形成 OpsinTech 内部需要的运维闭环即可。它们的价值是服务平台自身和具备运维场景的租户，而不是做成独立 AIOps 套件。

“智能工作台”建议从泛化命名中抽离出来，按业务场景重新归属：

| 原入口 / 能力 | 后续归属 | 建议命名 | 说明 |
| --- | --- | --- | --- |
| 通用 AI 会话 | Common Workspace Modules | Chats / AI Chat | 保留为底层通用入口 |
| 面向产品的智能生成 | Product Workspace | Product Studio / 产品创作台 / 需求工作台 | 用于想法澄清、PRD 生成、需求评审、产品资产保存 |
| 面向运维的智能执行 | Ops Workspace | Terminal / Incident Diagnosis | 用于命令执行、告警诊断、处置建议 |
| 面向研发的代码辅助 | Dev Workspace（远期） | Code Plugin / Coding Agent | 参考 opencode / Codex，只做轻量代码开发插件 |

远期如果做研发工作台，核心边界也要克制：

```text
Dev Workspace 的重点不是再做一个完整 IDE，也不是做研发管理平台。

更合理的方向是：
- 参考 opencode / Codex，提供轻量代码开发插件；
- 模型、权限、审计、上下文选择走 OpsinTech 平台；
- 插件负责读取仓库上下文、生成 diff、解释代码、辅助提交；
- 不优先做项目管理、CI/CD、制品、测试平台等重型研发工具；
- 差异化不强也没关系，它是平台能力的自然延伸，不是当前商业主线。
```

因此，三类业务工作台的边界可以定为：

| 工作台 | 当前优先级 | 核心用户 | 核心闭环 | 产品策略 |
| --- | --- | --- | --- | --- |
| Ops Workspace | 已有能力收敛 | 运维 / 平台管理员 | 告警、诊断、执行、记录 | 做闭环，不扩成通用运维套件 |
| Product Workspace | 当前新增重点 | 产品经理 / 业务负责人 | 想法、PRD、评审、产品资产 | 做资产沉淀和上下文复用 |
| Dev Workspace | 后年或远期预留 | 研发工程师 | 代码理解、生成 diff、提交建议 | 做插件，不做重型研发平台 |

---

### 18.6 与产品中台的关系

用户提到的“产品中台”方向是成立的，但不建议第一阶段就叫完整产品中台。

更合理的演进是：

```text
阶段 1：Product Workspace
  - 从想法到 PRD
  - 保存 Product Artifact
  - 证明产品经理愿意在平台内沉淀资产

阶段 2：Product Context Center
  - 选择文件、历史 PRD、页面、模块作为上下文
  - 让 AI 生成不发散
  - 让每次输出有来源、有边界、有待确认问题

阶段 3：Product Asset Hub
  - PRD、页面结构、原型说明、竞品、评审、任务之间建立关系
  - 支持版本、评论、评审、复用

阶段 4：Product Platform / 产品中台
  - 产品资产成为研发、测试、运营、告警、终端等模块的统一语义层
  - 对接 Jira / GitHub Issues / 飞书 / Confluence
  - 支持组织级产品知识治理

远期：Dev Workspace / 研发工作台
  - 参考 opencode / Codex 做轻量代码开发插件
  - 模型调用、租户权限、审计和上下文治理走 OpsinTech 平台
  - 插件只负责仓库上下文、代码解释、diff 生成和提交建议
  - 不优先建设完整 IDE、项目管理、CI/CD 或研发效能平台
```

所以当前新增模块不是“另起炉灶的产品中台”，而是产品中台的第一块业务资产底座。

---

### 18.7 为什么这个方向有差异化

普通 AI PRD 工具通常停留在：

```text
输入一句话 → 生成一篇 PRD → 用户复制走
```

OpsinTech 如果按 Product Workspace 方向做，差异化在于：

| 差异点 | 普通 AI PRD 工具 | Product Workspace |
| --- | --- | --- |
| 上下文 | 依赖用户一次性描述 | 绑定 Product Space、历史资产、文件、页面、业务对象 |
| 输出 | 一篇 Markdown | Product Artifact：有类型、状态、来源、结构化 JSON |
| 边界控制 | 容易发散 | 强制标注范围、非目标、权限、待确认问题 |
| 后续使用 | 复制到飞书 / Notion | 在平台内继续编辑、评审、版本化、复用 |
| 与研发衔接 | 靠人工转述 | 后续可转任务、测试用例、页面结构、验收清单 |
| 与现有系统结合 | 通用工具 | 能理解 OpsinTech 的终端、告警、租户、权限、安全审批等业务约束 |

真正的价值不是“AI 会写 PRD”，而是：

> AI 生成的内容能被纳入产品资产生命周期，并且后续每次新需求都能复用已有产品上下文。

---

### 18.8 代码仓库接入和 Git Clone 的位置

用户提到“是否需要支持上传代码 / git clone 代码，用于代码解读”。

这个方向有价值，但不应该在 V0.1 做成通用代码托管或 IDE。

推荐定位为：

```text
Code Context Source
```

它属于 Product Context 的一种来源，而不是 Product Workspace 的主功能。

能力边界：

| 能力 | V0.1 | 后续 |
| --- | --- | --- |
| 上传少量代码文件 | 可选，不作为主线 | 支持作为上下文附件 |
| Git Clone 仓库 | 不建议做 | 后续做只读索引 |
| 代码修改 / 提交 | 不做 | 仍需严格审批，不属于产品工作台核心 |
| 代码结构解读 | 手动选择文件即可 | 后续支持仓库结构摘要、路由识别、模型识别 |
| 从代码抽取产品上下文 | 不做 | 后续提取页面、接口、业务对象、权限规则 |

后续 Git 接入必须遵守：

```text
只读 clone
不执行仓库代码
不读取敏感文件
限制仓库大小
限制文件类型
权限过滤后再给 AI
索引结果可追溯来源 commit / file path
```

它的价值是让 AI 了解已有产品：

- 已有哪些页面；
- 已有哪些后端模型；
- 已有哪些 API；
- 已有哪些权限规则；
- 已有哪些终端 / 告警 / 文件能力；
- 新需求应该改哪里、不应该越界到哪里。

但实施顺序应该在 Product Artifact 闭环之后。

---

### 18.9 推荐更新后的实施顺序

结合当前已实现功能，建议实施顺序调整为：

```text
Step 1：升级 pm-analysis Skill
  让 AI 输出 Product Space、模块、页面、对象、权限、来源、待确认问题。

Step 2：新增 ProductSpace / ProductArtifact 最小模型
  只保存产品业务资产，不碰底层文件存储。

Step 3：新增 Product Workspace 页面
  展示 Product Space 和 Product Artifact，不做文件管理器。

Step 4：打通 Thread → AI 输出 → Product Artifact 保存
  复用现有会话、Skill、Artifact 访问能力。

Step 5：接入显式上下文选择
  从 Uploads、Thread Artifacts、历史 Product Artifacts 中选择上下文。

Step 6：再考虑 Product Context Registry
  做来源索引、摘要、权限过滤、引用追踪。

Step 7：再考虑只读 Git / 代码索引
  用于识别已有页面、业务对象、接口和权限规则。
```

这条路线的好处是：

- 不推翻当前架构；
- 不重复建设文件管理；
- 不和现有 `assets` 运维资产冲突；
- 可以很快验证产品经理是否愿意沉淀 PRD；
- 后续自然演进为产品上下文中心和产品资产中台。

---

## 19. 最终结论

Product Workspace 不应该作为独立“产品中台”从零建设，也不应该做成文件管理器。

它应该是 OpsinTech 现有 Workspace 架构下的一个新工作台模块，复用现有：

- Agent；
- Skill；
- Thread；
- Artifact 文件访问；
- Upload 文件能力；
- Tenant / User 权限；
- 按租户和用户动态裁剪的业务工作台导航；
- 当前终端、告警、文件空间等真实业务模块。

同时必须避免和现有 SSH / Keychain 资产体系混淆。

第一阶段只新增最小业务模型：

```text
ProductSpace
ProductArtifact
```

第一阶段目标是跑通：

```text
需求输入
  ↓
AI 澄清
  ↓
PRD 生成
  ↓
保存为 Product Artifact
  ↓
Product Workspace 中持续查看和复用
```

文件、Thread Artifact、Git 代码仓库都应该作为 Product Context 的来源，而不是 Product Workspace 的主体。

当这个闭环稳定后，再逐步扩展为：

```text
Product Workspace
  ↓
Product Context Center
  ↓
Product Asset Hub
  ↓
Product Platform / 产品中台
```

这既能保持与当前 OpsinTech 架构一致，又能形成区别于普通 AI PRD 工具的长期壁垒。
