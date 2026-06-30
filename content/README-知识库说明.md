# README-知识库说明

## 结构

- `01-源文档/按公众号`：全量公众号 Markdown，已转换为 Obsidian 文章卡片，每篇保留微信原文链接和本地源文件路径。
- `08-AI知识库/data/articles.jsonl`：文章级索引，适合 AI 问答引用文章。
- `08-AI知识库/data/chunks.jsonl`：段落级证据索引，适合 RAG、语义检索和问答溯源。
- `08-AI知识库/data/knowledge_atoms.jsonl`：按 dbskill 字段生成的轻量知识原子，包含 `knowledge/original/url/date/topics/type/confidence`。
- `08-AI知识库/indexes`：CSV 索引，适合 Excel 检查和人工筛选。
- `08-AI知识库/主题索引`：Obsidian 主题入口，使用双链连接文章。
- `08-AI知识库/选题线索`：面向专业文章和报告选题的候选池。
- `99-系统/构建审计.json`：本次构建统计和规则对齐说明。

## dbskill 对齐原则

1. 先保留原文，再做结构化；机器输出不覆盖来源事实。
2. 每条文章、chunk、知识原子都带原文 URL，AI 问答时可以点击回源。
3. `topics/type/confidence` 是检索标签，不是事实结论。
4. 报告选题优先从 `选题线索` 和 `chunks.jsonl` 回看证据。

## 本次构建

- 源目录：`C:\Users\Lily.Liu\工作文件\skill整理\爬数skill\程安公众号需求\历史公众号数据爬取\output_md`
- 目标库：`C:\Users\Lily.Liu\Documents\品牌营销知识库`
- Markdown：7428 篇
- 输出文章：7428 篇
- 输出 chunk：24933 段
- 输出知识原子：26427 条
