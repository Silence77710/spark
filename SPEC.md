 # Spark V1 — "种子" MVP 规格文档
 
 > 基于 PRODUCT.md，由 Codex 在 2026-08-10 完成决策与规格化。
 
 ---
 
 ## 一、项目结构
 
 遵循 AGENTS.md 定义：
 
 ```
 spark/
 ├── apps/web/          # Next.js (App Router) 主应用
 ├── packages/@spark/
 │   ├── db/            # SQLite 数据层 (better-sqlite3)
 │   ├── ui/            # 通用 UI 组件 (shadcn/ui)
 │   └── utils/         # 工具函数
 ├── package.json       # workspace root
 └── pnpm-workspace.yaml
 ```
 
 - 包管理器：pnpm
 - 样式：Tailwind CSS + shadcn/ui（默认 neutral 主题）
 - 数据库：better-sqlite3（纯本地，无网络依赖）
 
 ---
 
 ## 二、数据模型
 
 ### ideas 表
 
 | 字段 | 类型 | 约束 | 说明 |
 |------|------|------|------|
 | id | TEXT (UUID v7) | PK | 唯一标识 |
 | title | TEXT | NOT NULL | 标题（必填） |
 | content | TEXT | | 正文（Markdown，可选） |
 | status | TEXT | NOT NULL, DEFAULT 'seed' | 种子/萌芽/生长中/已实现/已归档/休眠 |
 | created_at | TEXT (ISO 8601) | NOT NULL | 捕获时间 |
 | updated_at | TEXT (ISO 8601) | NOT NULL | 最后修改时间 |
 | last_reviewed_at | TEXT (ISO 8601) | | 最后回看时间（回访用） |
 
 状态枚举：`seed` | `sprout` | `growing` | `realized` | `archived` | `dormant`
 
 时间线记录独立表（可选 V1 扩展，暂不实现）。
 
 ---
 
 ## 三、功能规格
 
 ### 3.1 闪电捕获
 
 - **入口**：主页（想法流）顶部，固定输入框
 - **行为**：输入后 Enter 提交，Shift+Enter 换行
 - **校验**：标题不能为空，自动去除首尾空白
 - **保存后**：清空输入框，列表顶部出现新卡片，滚动到顶部
 - **支持格式**：纯文本 + Markdown
 
 ### 3.2 想法卡片列表（时间线视图）
 
 - **排序**：按 created_at 倒序（最新的在最上面）
 - **卡片内容**：标题、内容预览（截取前 100 字）、状态标签、创建时间（相对时间如"3分钟前"）
 - **点击**：跳转到详情页
 - **空状态**：显示"还没有想法，写下第一个吧"提示
 - **分页**：V1 不做分页，一次性加载全部（本地数据量小）
 
 ### 3.3 想法详情页
 
 - **路由**：`/ideas/[id]`
 - **展示**：标题、正文（Markdown 渲染）、状态、创建/更新时间
 - **操作**：
   - 状态变更 dropdown（seed / sprout / growing / realized / archived / dormant）
   - 编辑按钮 → 进入编辑模式
   - 删除按钮 → 确认后删除
 - **编辑模式**：标题和内容可编辑，保存后回到详情页
 - **返回**：返回列表页
 
 ### 3.4 基础搜索
 
 - **入口**：列表页顶部搜索框
 - **行为**：实时搜索（输入即搜，防抖 300ms）
 - **范围**：搜索 title + content
 - **实现**：SQLite `LIKE '%keyword%'`
 - **空结果**：显示"没有找到匹配的想法"
 
 ### 3.5 每日一想法（最简回访）
 
 - **入口**：列表页顶部，搜索框上方
 - **触发**：每次加载主页时，随机选取一个 7 天前的想法
 - **展示**：一个轻量卡片，显示标题 + 内容摘要（前 50 字）+ "查看详情"链接
 - **如果没有 7 天前的想法**：不显示
 - **关闭**：可点击 X 关闭当次展示
 
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
 - 离线可用：核心功能无需网络
 - 数据安全：本地 SQLite 存储
 - 可导出：V1 不做，V4 规划
 
 ---
 
 *文档版本：v1.0 · 2026-08-10*
 *** End of File
