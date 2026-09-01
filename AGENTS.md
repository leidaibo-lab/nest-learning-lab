# Agent 工作入口

本文件是仓库内所有 Agent 的统一入口。开始分析、设计或实现前，先根据任务范围读取下列项目资料，不要在多个文件之间复制同一套规则。

## 必读顺序

1. 阅读本文件，确认协作语言、变更流程和质量要求。
2. 阅读 [系统学习路线](docs/learning-roadmap.md)，确认当前学习阶段和业务主线。
3. 阅读 [OpenSpec 配置](openspec/config.yaml) 与 [OpenSpec 工作流](openspec/README.md)。
4. 检查 `openspec/changes/` 中是否存在与任务相关的活动变更，并优先遵循其中的 proposal、specs、design 和 tasks。
5. 检查 [.agents/skills](.agents/skills/README.md)，仅在任务符合某个 Skill 的触发条件时读取和使用它。

## 工作规则

- 使用中文沟通、记录规格和说明关键决策；代码标识符与行业通用术语保持原有语言。
- 开始工作前使用 `git status`、`git log`、`git diff` 和代码检索确认当前状态，通过变更提取关键上下文。
- 行为新增或变更采用 OpenSpec `spec-driven` 流程；先明确 WHY 和 WHAT，再设计 HOW 和实施任务。
- 优先沿任务管理业务主线完成可验证的纵向增量，不创建互不关联的演示代码。
- 保持 NestJS 模块边界清晰，通过 Provider 和 Repository 边界隔离业务逻辑与基础设施。
- 测试范围与风险匹配：业务规则使用单元测试，基础设施边界使用集成测试，HTTP 契约使用 Fastify E2E 测试。
- 修改完成后运行适用的 lint、测试和构建命令，并通过 `git diff --check` 与 `git diff` 复核变更。
- 不覆盖、不回退与当前任务无关的已有修改。

## 提交规范

Git 提交必须遵循：

```text
type(scope): message
```

常用类型为 `feat`、`fix`、`test`、`docs`、`refactor` 和 `chore`。一个提交只表达一个可独立理解和验证的变更。

## 项目导航

| 内容 | 位置 |
| --- | --- |
| 长期学习阶段与近期迭代 | `docs/learning-roadmap.md` |
| OpenSpec 项目上下文与工件规则 | `openspec/config.yaml` |
| OpenSpec 操作流程 | `openspec/README.md` |
| 当前稳定能力规格 | `openspec/specs/` |
| 进行中的变更 | `openspec/changes/` |
| 项目级 Agent Skills | `.agents/skills/` |
| NestJS 应用代码 | `src/` |
| E2E 测试 | `test/` |
