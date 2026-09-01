## Why

当前应用只有根模块和空的演示 Controller，尚不能展示 NestJS 如何通过功能模块与依赖注入组织真实业务。第一阶段需要建立一条可运行、可测试的任务创建与查询链路，作为后续校验、持久化和权限能力的稳定基础。

## What Changes

- 移除未承载行为的 `test-demo` 示例，新增独立的 `TasksModule`。
- 定义任务实体、创建任务输入、任务服务和 Repository 抽象。
- 使用自定义 Provider Token 注入内存 Repository，实现任务创建与按 ID 查询。
- 暴露 `POST /tasks` 和 `GET /tasks/:id` HTTP 接口。
- 增加 Service 单元测试和基于 Fastify `app.inject()` 的 E2E 测试。
- 不在本阶段引入运行时 DTO 校验、数据库或统一异常格式。

## Capabilities

### New Capabilities

- `task-management`: 定义创建任务、按 ID 查询任务以及任务不存在时的基础行为。

### Modified Capabilities

无。

## Impact

- 应用模块：`AppModule` 将导入新的 `TasksModule`，不再直接注册 `TestDemoController`。
- HTTP API：新增 `POST /tasks` 与 `GET /tasks/:id`；保留现有根路径接口。
- 代码结构：新增 `src/tasks/` 功能模块及其领域、应用和内存基础设施组件。
- 依赖：不增加第三方运行时依赖。
- 测试：新增任务服务单元测试并扩展 Fastify E2E 测试。
