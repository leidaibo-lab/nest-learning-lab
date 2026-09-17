# continuous-integration Specification

## Purpose

定义项目在 push 和 pull request 中必须执行的自动化质量门禁，确保生产化变更经过一致的验证流程。
## Requirements
### Requirement: 自动化质量门禁

每次 push 和 pull request MUST 在干净的 CI 环境中安装锁定依赖、启动 PostgreSQL、应用 migration，并依次通过 lint、单元测试、集成测试、Fastify E2E 测试和生产构建。

#### Scenario: 验证通过

- **WHEN** 代码和数据库 migration 满足项目契约
- **THEN** CI job 成功完成全部检查

#### Scenario: 检查失败

- **WHEN** 任一检查或 migration 失败
- **THEN** CI job 失败并阻止该变更被视为通过

