# OpenSpec 工作流

本目录使用 OpenSpec `spec-driven` schema 管理学习实验中的行为变更。OpenSpec 定义“为什么做、系统应做什么、如何实现和如何验收”，`docs/learning-roadmap.md` 定义长期学习顺序。

## 目录

```text
openspec/
├── config.yaml          # 项目上下文及各类工件规则
├── specs/               # 已实现并归档的当前能力规格
└── changes/
    ├── <change-name>/   # 进行中的变更
    └── archive/         # 已完成变更的历史记录
```

进行中的变更使用 kebab-case 命名，并按默认工作流维护以下工件：

```text
proposal.md -> specs/<capability>/spec.md -> design.md -> tasks.md
```

## 开始一个变更

```bash
openspec new change establish-task-module
openspec status --change establish-task-module
openspec instructions proposal --change establish-task-module
```

按照 `openspec instructions <artifact> --change <change-name>` 的输出依次完成工件。编码前至少应完成 proposal、specs、design 和 tasks；极小且不涉及设计决策的变更，也要保留简短 design，确保学习过程中的技术选择可回顾。

## 验证与归档

```bash
openspec validate <change-name>
openspec status --change <change-name>
openspec archive <change-name>
```

归档前必须满足：

- `tasks.md` 已全部完成。
- lint、单元测试、E2E 测试和构建均通过。
- `git diff` 中没有无关改动。
- 提交信息符合 `type(scope): message`。

当前稳定规格包括 `task-management`、`task-validation` 和 `task-persistence`；前三阶段变更均已归档到 `changes/archive/`。下一项计划变更将为任务状态更新增加事务与并发控制。
