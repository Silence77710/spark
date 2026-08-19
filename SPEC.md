# Spark V1 — "种子" MVP 规格文档
 
> 基于 PRODUCT.md，由 Codex 在 2026-08-10 完成决策与规格化。
 
---
 
 ## 一、项目结构
 
 遵循 AGENTS.md 定义：
 
 ```
 spark/
 ├── apps/web/          # Next.js (App Router) 主应用
 ├── packages/@spark/
 │   ├── ai/            # AI 思考伙伴（OpenAI 兼容 provider + 苏格拉底）
 │   ├── db/            # MySQL 数据层（mysql2 连接池）
 │   └── utils/         # 工具函数
 ├── package.json       # workspace root
 └── pnpm-workspace.yaml
 ```
 
 - 包管理器：pnpm
 - 样式：Tailwind CSS + shadcn/ui（默认 neutral 主题）
 - 数据库：MySQL 8（本机 spark-mysql Docker 容器，库 spark；mysql2 连接池）
 
 ---
 
 ## 二、数据模型
 
 ### ideas 表
 
 | 字段 | 类型 | 约束 | 说明 |
 |------|------|------|------|
 | id | VARCHAR(36)（UUID） | PK | 唯一标识 |
 | title | VARCHAR(500) | NOT NULL | 标题（必填） |
 | content | TEXT | | 正文（Markdown，可选） |
 | status | VARCHAR(20) | NOT NULL, DEFAULT 'seed' | 种子/萌芽/生长中/已实现/已归档/休眠 |
 | collection | VARCHAR(100) | | 所属集合（可选） |
 | importance | TINYINT | NOT NULL, DEFAULT 0 | 重要程度（0-4） |
 | is_capsule | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否为时间胶囊 |
 | unlock_at | DATETIME(3) | NULL | 胶囊解锁时间 |
 | epitaph | TEXT | NULL | 墓志铭（归档时填写） |
 | created_at | DATETIME(3) | NOT NULL | 捕获时间 |
 | updated_at | DATETIME(3) | NOT NULL | 最后修改时间 |
 | last_reviewed_at | DATETIME(3) | | 最后回看时间（回访用） |
 
 状态枚举：`seed` | `sprout` | `growing` | `realized` | `archived` | `dormant`
 
 时间线记录见下方 idea_activities 表（已实现）。
 
 ### idea_activities 表
 
 | 字段 | 类型 | 约束 | 说明 |
 |------|------|------|------|
 | id | VARCHAR(36) | PK | 唯一标识 |
 | idea_id | VARCHAR(36) | FK → ideas.id ON DELETE CASCADE | 所属想法 |
 | type | VARCHAR(20) | NOT NULL, DEFAULT 'general' | 活动类型 |
 | content | TEXT | NOT NULL | 活动描述 |
 | created_at | DATETIME(3) | NOT NULL | 记录时间 |
 
 活动类型枚举（一期）：`capture` | `status_change` | `importance_change` | `note` | `research` | `discussion` | `prototype` | `decision` | `reference` | `general`
 
 **自动记录规则**：
 - 捕获想法时自动生成 `capture` 类型活动
 - 状态变更时自动生成 `status_change` 类型活动，记录"从 X 变为 Y"
 - 重要程度变更时自动生成 `importance_change` 类型活动，记录"从 X 变为 Y"
 - 墓志铭设置时自动生成 `general` 类型活动，记录"墓志铭：{内容}"
 
 ### ai_interactions 表
 
 | 字段 | 类型 | 约束 | 说明 |
 |------|------|------|------|
 | id | VARCHAR(36) | PK | 唯一标识 |
 | feature | VARCHAR(30) | NOT NULL | 功能：socratic / connector / catalyst / retro / mirror |
 | idea_id | VARCHAR(36) | NULL | 关联的 idea（索引 idx_ai_interactions_idea_id） |
 | request_summary | VARCHAR(200) | NULL | 请求摘要（不含完整内容） |
 | response_summary | VARCHAR(500) | NULL | 响应摘要 |
 | tokens_used | INT | NULL | token 消耗 |
 | created_at | DATETIME(3) | NOT NULL | 交互时间 |
 
 ### settings 表
 
 | 字段 | 类型 | 约束 | 说明 |
 |------|------|------|------|
 | key | VARCHAR(100) | PK | 设置项键名 |
 | value | TEXT | | 设置项值（JSON） |
 
 当前支持的键：
 - `importance_levels` — 自定义重要程度等级名称和描述（JSON 数组，5 项）
 - `ai_enabled` — AI 助手总开关（boolean，默认 false）
 
 ---
 
 ## 三、功能规格
 
 ### 3.1 闪电捕获
 
 - **入口**：主页（想法流）顶部，固定输入框
 - **行为**：输入后 Enter 提交，Shift+Enter 换行
 - **校验**：标题不能为空，自动去除首尾空白
 - **保存后**：清空输入框，列表顶部出现新卡片，滚动到顶部
 - **支持格式**：纯文本 + Markdown
 - **时间胶囊选项**：展开捕获框后可勾选「设为时间胶囊」，选择解锁日期（30天 / 90天 / 1年预设），详见 3.8
 - **活动记录**：捕获时自动在活动时间线中记录一条"捕获了想法「标题」"的活动
 
 ### 3.2 想法卡片列表（时间线视图）

- **页面布局**：宽屏（≥lg）为双栏——主列自上而下为捕获框、筛选栏、分组列表；右侧为 280px sticky 侧栏（今日回顾 / 状态 / 集合，条目点击即筛选主列表）；窄屏回退单列，今日回顾以 banner 呈现在捕获框上方，筛选全部由筛选栏承担
- **筛选交互**：采用「状态 pills + 集合下拉弹层 + 激活条件标签」模式
  - 状态 pills：`全部` + 六个状态的横排多选 chip；状态数量有界，窄屏时该区域横向滚动
  - 集合下拉弹层：集合为用户自建、数量无界，不占用筛选栏横排空间，收进右侧「集合」按钮的下拉弹层；弹层内含搜索框、「全部集合」、带想法数量的集合列表（点击单选切换），底部为「管理集合」入口
  - 管理集合模式：弹层内切换，支持行内重命名、删除（删除前提示"N 条想法将变为未分类"，需二次确认）
  - 选中集合后，「集合」按钮本身显示该集合名与想法数量，作为当前筛选状态
  - 激活条件标签：有筛选条件时，在筛选栏下方显示可单独移除的 token
- **排序**：默认按重要程度倒序 + 创建时间倒序（"重要优先"）；可切换为最新创建 / 最早创建 / 最近更新 / 按状态
- **顶部导航**：高频页面（图谱/看板/探索/回顾）常驻 header，低频页面（节律/画像/墓地/设置）收进「更多」下拉；有墓地想法时「更多」按钮及下拉内墓地项显示数量角标
- **卡片布局**：左右双栏扫读结构。左栏为扫读主线：标题（14px semibold，单行截断，hover 变琥珀色）+ 内容预览一行（截取前 120 字，12px 灰字截断）；右栏为元信息列，右对齐、自上而下最多三行：相对时间（如"3分钟前"）、状态（状态点 + 状态名）、#集合（可选，超长截断）；卡片纵向留白收敛（py-2.5），提升单位高度信息密度
- **重要度表达**：卡片左缘 3px 色条，颜色为琥珀单色系深浅刻度（1=amber-200 → 2=amber-400 → 3=amber-600 → 4=amber-800，越深越重要），0 未评级为透明占位、不显示色彩，避免噪音
- **色彩收敛**：列表卡片不使用彩色 pill；集合以 `#名称` 中性灰文本展示；情绪以标题后 6px 彩色小圆点暗示（hover 显示情绪名，详情页可见完整信息）
- **久未回看**：超过 30 天未回看的卡片在右栏状态行末尾以琥珀色追加"· N天未回看"
- **快捷菜单**：右栏时间行左侧的「···」按钮（hover 显现、打开时常驻，隐藏时保留占位不位移），内含推进状态、快速调整重要程度、归档
- **密封胶囊**：is_capsule 且 unlock_at 在未来的卡片显示锁图标 + 倒计时，不显示 content 预览
- **点击**：跳转到详情页
- **空状态**：显示"还没有想法，写下第一个吧"提示
- **分页**：每页 20 条；滚动接近底部时自动加载下一页（IntersectionObserver，提前约 320px 触发），自动加载失败时不重试、保留手动「加载更多」按钮兜底；底部显示「已显示 X / 共 Y 条」
- **分组**：列表按当前排序语义分组，分组标题（13px 半粗标题 + 11px 组内数量 + 细分隔线）sticky 吸附在视口顶部（半透明背景 + 毛玻璃），滚动时提供方位感
  - 最新创建 / 最近更新 → 按对应时间字段分档：今天 / 昨天 / 本周（周一起算）/ 更早
  - 最早创建 → 同上，但组序反转（更早在前）
  - 重要优先 → 按重要度等级分组（4 → 0，使用 settings 自定义等级名）
  - 按状态 → 按生命周期状态分组（种子 → 休眠）
- **总数**：搜索框右侧常驻显示当前筛选条件下的想法总数
 
 ### 3.3 想法详情页
 
 - **路由**：`/ideas/[id]`
 - **展示**：标题、正文（Markdown 渲染）、状态、创建/更新时间
 - **密封胶囊展示**：is_capsule 且未到 unlock_at 时，只显示标题 + 密封状态 + 倒计时，隐藏正文和时间线；解锁后正常展示
 - **操作**：
   - 状态变更 dropdown（seed / sprout / growing / realized / archived / dormant）
   - 编辑按钮 → 进入编辑模式
   - 删除按钮 → 确认后删除
 - **编辑模式**：标题和内容可编辑，保存后回到详情页
 - **返回**：返回列表页
 
 **活动时间线**：详情页底部展示活动时间线，包含：
   - 自动记录：捕获活动、状态变更活动、重要程度变更活动
   - 手动记录：通过底部输入框添加，可选活动类型（笔记/调研/讨论/原型/决策/参考/一般）
   - 时间线按时间倒序排列，每条显示类型图标、内容、相对时间
   - 输入框支持 ⌘+↵ 快捷发送
 
 **想法墓志铭**：详情页底部展示已有墓志铭（如有，斜体），详见 3.9
 
 ### 3.4 基础搜索
 
 - **入口**：列表页顶部搜索框
 - **行为**：实时搜索（输入即搜，防抖 300ms）
 - **范围**：搜索 title + content
 - **实现**：MySQL `LIKE '%keyword%'`（title + content）
 - **空结果**：显示"没有找到匹配的想法"
 
 ### 3.5 每日一想法（最简回访）
 
- **入口**：宽屏（≥lg）在右侧栏顶部卡片；窄屏为捕获框上方的轻 banner
- **触发**：每次加载主页时，随机选取一个 7 天前的想法
 - **展示**：一个轻量卡片，显示标题 + 内容摘要（前 50 字）+ "查看详情"链接
 - **如果没有 7 天前的想法**：不显示
 - **关闭**：可点击 X 关闭当次展示
 
 ### 3.6 重要程度
 
 - **默认等级**（0-4）：
   - 0 — 未评级：刚捕获，还没判断
   - 1 — 灵感碎片：有点意思，先放着
   - 2 — 有意思：值得回看
   - 3 — 想做：想认真发展
   - 4 — 必做：核心想法，必须实现
 - **捕获时**：默认为 0（未评级），不强制选择
- **列表页**：
  - 卡片左缘以 3px 色条表达重要程度（琥珀单色系深浅刻度：1=amber-200 → 4=amber-800，0 不显示色条，避免噪音）
  - 卡片快捷菜单内可快速调整重要程度
  - 默认排序为"重要优先"（importance DESC, created_at DESC）
 - **刷新体验**：筛选/排序变更时保留已有列表原样，数据返回后静默替换；仅首次加载显示骨架屏
 - **详情页**：状态下拉框旁提供重要程度下拉框，可随时调整
 - **变更记录**：重要程度变化自动记录到活动时间线
 - **个性化**：`/settings` 页面支持自定义每个等级的名称和描述，保存到 settings 表
 
 ---
 
 ### 3.7 AI 苏格拉底（Socratic Questioner）
 
 **目标**：保存想法后被追问一个有深度的问题，迫使走深一步。
 
 - **触发条件**：保存想法后，如果 AI 开启且非时间胶囊
 - **交互流程**：
   - 保存成功后，列表上方显示 AI 追问卡片（带 loading 态："正在思考一个问题..."）
   - 问题只显示一个，不连续追问
   - 用户可回答（答案存为 note 类型活动，前缀"苏格拉底追问回答："）或跳过（点击"下次再说"）
 - **降级策略**：API 调用失败时静默降级，不显示问题、不报错、不阻塞保存
 - **语言一致**：问题语言与 idea 内容语言一致
 - **隐私控制**：设置页有 AI 总开关（`ai_enabled`），默认关闭
 - **数据记录**：每次调用记录到 `ai_interactions` 表（feature = 'socratic'）
 - **API**：`POST /api/ai/socratic`，请求体 `{ idea_id, title, content }`，返回 `{ question }` 或 `{ question: null }`（降级）
 
 ---
 
 ### 3.8 时间胶囊（Time Capsule）
 
 **目标**：密封想法，到期后解锁查看，为后续 AI 回望对话做铺垫。
 
 - **捕获时**：展开捕获框中勾选「设为时间胶囊」，选择解锁日期（30天 / 90天 / 1年预设）
 - **数据字段**：`is_capsule`（BOOLEAN）+ `unlock_at`（DATETIME(3)）
 - **密封展示**：
   - 列表卡片：显示锁图标 + "X 天后解锁"，不显示 content 预览
   - 详情页：只显示标题 + 密封状态 + 倒计时，隐藏正文和时间线
 - **解锁后**：胶囊标记保留，但内容正常展示和编辑
 - **V1 范围**：仅密封 + 解锁，不含 AI 回望对话（V2 P1 功能 F07）
 
 ---
 
 ### 3.9 想法墓志铭（Idea Epitaph）
 
 **目标**：放弃想法时记录原因，积累决策日志。
 
 - **触发时机**：idea 状态变更为 archived 或 dormant 时，弹出非模态墓志铭输入框（可跳过）
 - **数据字段**：`epitaph`（TEXT）
 - **存储方式**：PATCH `/api/ideas/[id]` 传 `epitaph` 字段，自动生成 `general` 类型活动（"墓志铭：{内容}"）
 - **详情页展示**：底部显示已有墓志铭（斜体），无墓志铭时不显示
 - **非阻塞性**：墓志铭可选，不强制，不阻塞状态变更
 
 ---
 
 ### 3.10 想法墓地（Graveyard）
 
 **目标**：集中展示已归档/休眠的想法和它们的墓志铭。
 
- **路由**：`/graveyard`
- **入口**：首页 header 导航「更多」下拉内（有待安葬数量时在「更多」按钮及墓地项上显示角标）
 - **数据来源**：查询所有 status = archived 或 dormant 的 idea
 - **排序**：按最近更新时间倒序
 - **展示内容**：标题（带删除线）、墓志铭（如有，斜体）、状态标签、相对时间
 - **空状态**：显示"还没有安葬的想法"
 - **交互**：点击卡片跳转到详情页
 
 ---
 
 ## 四、UI 设计原则
 
 - 遵循 shadcn/ui 默认主题，Tailwind neutral 色板
 - 简洁、留白充足、文字为主
 - 避免装饰性元素（渐变、插图、阴影堆叠）
 - 响应式：桌面优先，移动端适配
 - 中文字体使用系统默认字体栈
 
 ---
 
 ## 五、非功能性需求
 
 - 启动速度：首次加载 < 1.5s
 - 离线可用：全部为本地服务（Next.js + 本机 Docker MySQL），无外部网络依赖
 - 数据安全：本机 MySQL 容器（spark-mysql）存储
 - 可导出：V1 不做，V4 规划
 
 ---
 

## 六、P1 功能规格（V2 扩展）

### 6.1 AI 连接器（Connection Maker）

- **目标**：AI 主动发现用户没想到的想法之间的连接
- **触发**：首页「发现连接」按钮，用户主动触发（AI 开启时显示）
- **前置条件**：非归档 idea 总数 >= 5，否则提示"想法还不够多"
- **AI 行为**：读取所有非归档 idea 的 title+content，LLM 找出 1-3 对"看似不相关但底层可能有连接"的想法
- **去重**：不推荐已有关联的 idea 对
- **用户操作**：每对可「确认关联」(POST /api/relationships) 或「忽略」
- **数据记录**：记录到 ai_interactions（feature = 'connector'）
- **API**：`POST /api/ai/connect` — 返回 `{ pairs: [{sourceId, sourceTitle, targetId, targetTitle, explanation}] }`
- **关联管理**：
  - `GET /api/relationships` — 列出所有关联
  - `POST /api/relationships` — 创建关联（含去重检查，双向查重）
  - `DELETE /api/relationships/[id]` — 删除关联
- **降级**：API 失败时返回空数组，不报错

### 6.2 想法杂交台（Hybrid Catalyst）

- **目标**：AI 挑选两个看似不相关但底层结构相似的想法催化碰撞
- **位置**：首页捕获框下方，AI 开启时显示「杂交台」按钮
- **前置条件**：非归档 idea 总数 >= 4，否则提示"想法还不够多"
- **AI 行为**：从不同集合/主题中挑选 2 个 idea，附一句催化说明
- **UI**：两个 idea 卡片（标题+内容预览+集合标签）+ AI 催化提示 + 输入框 + 「碰撞」/「换一对」/「跳过」
- **碰撞生成**：POST /api/ideas 传 parent_a_id + parent_b_id，自动记录"从「A」和「B」杂交诞生"活动
- **API**：`POST /api/ai/catalyst` — 返回 `{ pair: { ideaA: {id, title, content, collection}, ideaB: {...}, catalyst } }`
- **降级**：API 失败时返回 null，显示提示文案

### 6.3 AI 回望对话（Retro Dialogue）

- **目标**：胶囊解锁后与了解完整上下文的 AI 对话回望
- **适用**：is_capsule = true 且 unlock_at 已过期的 idea
- **入口**：详情页显示「与过去的自己对话」按钮（AI 开启且 retro 功能开启时）
- **交互**：多轮对话——消息列表 + 输入框 + 发送/结束按钮
- **首次打开**：POST /api/ai/retro 传 idea_id（无 history）→ 获取开场白
- **继续对话**：POST /api/ai/retro 传 idea_id + history → 获取回复
- **AI 行为**：用提问引导反思，不替用户写总结，基于原始内容+中间活动
- **结束对话**：用户点击「结束」→ 输入"现在的我怎么看" → 存为 note 活动
- **API**：`POST /api/ai/retro` — 返回 `{ reply: string }`
  - 请求体：`{ idea_id, history?: [{role, content}] }`
  - 校验：胶囊必须已解锁，否则 403
- **降级**：API 失败时返回 null，不阻塞页面

### 6.4 AI 隐私控制（完整版）

- **分功能开关**：4 个功能独立开关——socratic / connector / catalyst / retro
- **数据发送日志**：设置页显示最近 20 条 AI 交互记录（功能类型、请求摘要、时间、token 消耗）
- **API**：
  - `GET /api/settings` 返回 `ai_features` JSON
  - `PUT /api/settings` 接受 `ai_features` 更新
  - `GET /api/ai/interactions?limit=20` 返回交互日志

---

*文档版本：v1.5 · 2026-08-19（AI 调用健壮性：chatCompletion 经 globalThis 串行队列发往上游，避免并发触发 429 限流；网络错误与 429/5xx 自动重试 2 次，429 退避 5s/15s；全部 /api/ai/* 路由异常时 console.error 记录日志并静默降级；杂交台区分「未选到配对」与「AI 异常」两种提示）*
