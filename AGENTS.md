 # AGENTS.md — Spark 想法操作系统
 
 本文件声明了 Spark 项目的工程规范配置。AI Coding 工具通过此文件加载对应的规范。
 
 ## 项目信息
 
- **项目名称**：Spark — 想法操作系统
- **项目等级**：S1（工具级，V1 MVP 阶段；计划升级至 S2）
- **项目类型**：fullstack（Next.js + MySQL）
- **额外启用规范**：（暂不启用，随项目升级逐步引入）
- **启用的 Skills**：writing-commit-messages, reviewing-code, systematic-debugging, grill-me, grill-with-docs, to-tickets, triage, domain-modeling, grilling, implement, wayfinder, research, wizard, code-review, diagnose-bugs, improve-codebase-architecture, teach, wait-what, handoff, setup-matt-pocock-skills

## 文档同步（硬规则）

代码或业务发生变更时，必须在同一次变更中同步更新受影响的文档。文档与代码不一致视为缺陷（bug）。

- 技术栈、数据存储、目录结构、运行方式变化 → 更新 AGENTS.md
- 功能规格、数据模型、交互行为变化 → 更新 SPEC.md
- 产品定位、版本范围、设计哲学变化 → 更新 PRODUCT.md
- 提交前自检：对照 `git diff`，凡涉及上述行为的，确认对应文档已同步

## 代码组织（硬规则）

- **单文件长度**：单文件代码超过 400 行必须评估拆分；超过 600 行禁止合入。页面组件只做状态编排与组合，展示单元拆到 `apps/web/src/components/`，可复用逻辑收进 `apps/web/src/hooks/`，纯函数与常量收进 `apps/web/src/lib/`。
- **按功能点拆分**：一个文件只承担一个功能点；新增功能优先新建文件，不往已有大文件里追加。
- **共享配置唯一定义**：跨页面使用的常量、色彩映射、枚举配置只允许在 `apps/web/src/lib/config.ts` 定义一次，其他文件 import 使用，禁止复制副本。
- **提交前自检**：对本次触碰过的文件执行 `wc -l`，超标必须当场拆分，不留"以后再说"。

## 规范引用
 
 本规范遵循 PSES（Personal Software Engineering Standard）。
 
 ### 规范路径
 
 本项目的 PSES 路径：`../personal-engineering-standard/`
 
 ### 根据 S1 等级，自动加载以下规范文件
 
 - [core/principles.md](../personal-engineering-standard/core/principles.md) — 设计原则
 - [core/universal-coding.md](../personal-engineering-standard/core/universal-coding.md) — 通用编码规范
 - [core/git-workflow.md](../personal-engineering-standard/core/git-workflow.md) — Git 工作流
 - [core/documentation.md](../personal-engineering-standard/core/documentation.md) — 文档规范
 - [core/project-grading.md](../personal-engineering-standard/core/project-grading.md) — 项目分级
 
 ### 根据项目类型，加载 Profile 文件
 
 - [profiles/fullstack.md](../personal-engineering-standard/profiles/fullstack.md) — 全栈项目规范
 
 ### 额外启用的高级规范
 
 （暂不启用，V1 阶段遵循 KISS 原则）
 
 ### Skills 工作流
 
 - writing-commit-messages — Git commit message 规范
 - reviewing-code — 代码审查
 - systematic-debugging — 结构化调试
- grill-me — 拷问想法，做之前先想清楚
- grill-with-docs — 拷问 + 生成 ADR 和术语表
- grilling — grill-me 实际执行的深度访谈引擎
- domain-modeling — 领域建模（grill-with-docs 依赖）
- to-tickets — 把需求拆成可执行的 Tickets
- triage — 分类和评估 Issues
- implement — 按 spec 实现功能
- wayfinder — 探索方向，决定下一步做什么
- research — 代码库调研
- wizard — 分步引导式开发
- code-review — 代码审查
- diagnose-bugs — 诊断 Bug
- improve-codebase-architecture — 改进架构
- teach — 教学引导
- wait-what — 停下来思考
- handoff — 任务交接
- setup-matt-pocock-skills — 首次运行配置（设置 Issue Tracker 等）
 
 ### Skills 存放位置
 
 本项目的 Skills 存放在共享目录，通过符号链接访问：
 
 - **共享仓库**：`../.cursor/skills/`（即 `IDEA_CODE/.cursor/skills/`）
 - **访问方式**：`spark/.cursor/skills/` → `../.cursor/skills/`（符号链接）
 - **所有 IDEA_CODE 下的项目都可引用此共享目录**
 
 使用方式：在对话中直接调用 `/skill-name`，例如 `/grill-me` 或 `/to-tickets`。
 
 ## 同级项目引用
 
 本项目中可直接参考或复用的同级项目（位于 `../`）：
 
 ### personal-engineering-standard
 
 路径：`../personal-engineering-standard/`
 作用：工程规范体系，定义了 Spark 开发中应遵循的编码、设计、文档、Git 等规范。
 使用方式：通过本 AGENTS.md 加载规范文件，AI 按规范执行。
 
 ### frontend-scaffold
 
 路径：`../frontend-scaffold/`
 作用：前端 Monorepo 脚手架（Vue 3 + Element Plus）。技术栈与 Spark 不同，但 monorepo 结构（`apps/` + `packages/` 分层、`pnpm-workspace.yaml` 配置）可作为组织参考。
 使用方式：开发时参考其目录结构和 monorepo 组织方式，不直接复制代码。
 
 ### service-scaffold
 
 路径：`../service-scaffold/`
 作用：Java 微服务脚手架（Spring Cloud Alibaba）。当 Spark 需要后端服务（如云同步、多端协作）时，可直接复制并修改为 Spark 后端。
 使用方式：V1 阶段不需要；后续后端服务阶段，复制 `../service-scaffold/` 到 `spark/server/`，按需裁剪模块。
 
 ## 技术栈
 
 | 层面 | 技术选型 | 来源 |
 |------|---------|------|
| 前端框架 | Next.js (App Router) | 产品定义 |
| 样式 | Tailwind CSS + shadcn/ui | 产品定义 |
| 数据存储 | MySQL 8（本机 spark-mysql 容器，库 spark，mysql2 连接池） | 代码现状 |
| 图谱渲染 | D3.js 或 vis-network | 产品定义 |
| 包管理 | pnpm (参考 frontend-scaffold 结构) | 参考同级项目 |
| 后端服务 | 暂无需；需要时从 service-scaffold 复制 | 参考同级项目 |

## 运行方式

数据库为本机 `spark-mysql` Docker 容器（MySQL 8，端口 3306）中的 `spark` 库。连接配置见 `packages/@spark/db`，默认 `127.0.0.1:3306`，可用环境变量 `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` 覆盖。

AI 功能（思考伙伴）通过 OpenAI 兼容接口调用，需在 `apps/web/.env.local` 配置 `AI_API_KEY`（必需，无硬编码兜底）、`AI_BASE_URL`、`AI_MODEL`，模板见根目录 `.env.example`；未配置时 AI 功能静默降级不可用，其余功能不受影响。上游对并发请求限流（429），所有 AI 调用经 `packages/@spark/ai` 的进程内串行队列发出，并自动重试（429/5xx/网络错误最多 2 次），因此多个 AI 功能同时触发时后发的请求会排队等待，属正常现象。

```bash
# 本地开发
pnpm install
pnpm dev          # http://localhost:3000

# 数据库初始化（首次运行或重建容器后执行）
docker exec -i spark-mysql mysql -uroot -pspark123 < packages/@spark/db/schema.sql

# 本地镜像运行（生产模式，容器通过 host.docker.internal 连 spark-mysql）
docker build -t spark-web:local .
docker run -d --name spark-web -p 3000:3000 \
  -e MYSQL_HOST=host.docker.internal \
  -e AI_API_KEY=<your-key> \
  spark-web:local
```

## 项目结构

 ```
 spark/
├── AGENTS.md              # 本文件
├── PRODUCT.md             # 产品定义文档
├── SPEC.md                # V1 规格文档
├── PRD-AI.md              # AI 助手 PRD（思考伙伴模块）
├── Dockerfile             # 本地镜像构建（生产运行）
 ├── apps/                  # 应用
 │   └── web/               # Next.js 主应用
 │       └── src/
 │           ├── app/       # 页面与 API 路由（/ /explore /graph /kanban /rhythm /retro /graveyard /profile /settings /ideas/[id]）
│           ├── components/ # 列表页组件（site-header / capture-box / filter-bar / idea-card / idea-list / ai-panels / daily-review / home-sidebar）与通用组件（markdown / activity-timeline / bloodline / ui）
 │           ├── hooks/     # 客户端 Hooks（use-outside-click / use-ai-companion）
 │           └── lib/       # 共享配置与纯函数（config.ts 为展示配置唯一定义处 / types.ts / group-ideas.ts）
 ├── packages/              # 共享包
│   └── @spark/            # 共享模块
│       ├── utils/         # 工具函数
│       └── db/            # 数据层（mysql2 连接池，MySQL）
│           └── schema.sql # 数据库初始化脚本
├── .cursor/
 │   └── skills/            # 项目级 Skills
 ├── package.json
 ├── pnpm-workspace.yaml
 └── tsconfig.json
 ```
 
 ## AI 行为约束
 
 ### 允许
 
 - 按照项目规范和 PSES 规范生成代码
 - 修复 Bug 和性能问题
 - 添加测试
 - 更新文档
 - 重构代码（保持相同功能）
 - 参考 `../frontend-scaffold/` 的 monorepo 结构模式
 - 当需要后端服务时，从 `../service-scaffold/` 复制代码并适配
 
 ### 需要确认
 
 - 修改项目架构
 - 新增第三方依赖
 - 修改数据库 schema
 - 修改公共 API
 - 大规模重写（超过 30% 已有代码）
 - 升级项目等级
 - 引入 advanced/ 级别的规范
 
 ### 禁止
 
 - 提交敏感信息（密码、密钥、Token）
 - 删除无 git 历史的重要代码
 - 修改 .env 文件（只修改 .env.example）
 - 修改本 AGENTS.md 中的项目等级和类型声明（除非明确要求）
 
 ## AI 工作流程
 
 1. 读取本 AGENTS.md，确定项目等级和类型
 2. 加载对应的规范文件（`../personal-engineering-standard/core/` 各文件）
 3. 分析需求，确认修改范围
 4. 如果修改涉及"需要确认"的项，先询问
 5. 执行修改
 6. 同步更新受影响的文档（见「文档同步」硬规则）
 7. 按 S1 等级要求进行基本检查（代码风格、错误处理、日志）
 8. 提交或输出结果
 
 ## V1 阶段特别约束
 
 遵循 PRODUCT.md 中的 V1 范围（"种子"MVP），限定在：
 
 - 闪电捕获（纯文本输入）
 - 想法卡片列表（时间线视图）
 - 单个想法详情页（含状态、时间线）
 - 基础搜索
 - MySQL 存储（本机 spark-mysql 容器的 spark 库）
 
 不允许超前实现 V2/V3 功能（图谱、回访、看板、自动关联等）。
