# Project Skills

本目录用于存放只服务于当前仓库的 Agent Skills。通用能力应放在个人或团队共享 Skill 仓库中，避免项目内规则无限膨胀。

## 目录约定

```text
.agents/skills/
└── <skill-name>/
    ├── SKILL.md          # 必需：触发条件、执行步骤和完成标准
    ├── scripts/          # 可选：可复用的自动化脚本
    ├── references/       # 可选：按需读取的项目知识
    └── assets/           # 可选：模板或静态资源
```

Skill 名称使用 kebab-case。每个 `SKILL.md` 应至少说明：

- 何时使用以及何时不应使用。
- 执行前需要读取的上下文。
- 可重复的操作步骤和安全边界。
- 必须运行的验证命令及完成标准。

新增 Skill 前先确认它代表重复出现的项目工作流，而不是一次性任务。涉及规格驱动开发时，优先复用 `openspec/config.yaml` 和对应 change 中的工件，不在 Skill 中复制业务规格。
