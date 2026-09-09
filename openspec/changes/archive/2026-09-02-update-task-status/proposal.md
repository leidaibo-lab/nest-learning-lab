## Why

任务目前只能创建和查询，无法体现真实协作中的状态流转，也没有并发更新保护。第四阶段增加状态更新接口，用任务版本号拒绝过期写入，并将任务更新与操作事件放进同一数据库事务，学习 Prisma `$transaction`、条件更新和一致性边界。

## What Changes

- 扩展任务状态为 `todo`、`in_progress` 和 `done`，新增 `version` 版本号。
- 新增 `TaskEvent` 模型，记录每次成功的状态变更。
- 新增 `PATCH /tasks/:id/status`，请求携带目标状态和 `expectedVersion`。
- 定义允许的状态转换，拒绝非法转换。
- 使用 Prisma 交互式事务，在条件版本匹配时同时更新任务并写入事件。
- 版本不匹配返回 HTTP 409，任务不存在返回 404，非法状态转换返回 400。
- 增加内存 Repository 的状态更新能力、Prisma 集成测试和并发 E2E 测试。

## Capabilities

### New Capabilities

- `task-status`: 定义任务状态流转、版本校验、冲突响应和操作事件。

### Modified Capabilities

- `task-management`: Task 增加 `version`，Repository 增加带版本条件的状态更新能力。
- `task-persistence`: PostgreSQL 增加 TaskEvent 表，并以事务保证任务和事件的一致性。

## Impact

- API：新增 `PATCH /tasks/:id/status`。
- 数据模型：Task 增加 `version`；新增 `task_events` 表及迁移。
- 业务层：扩展 Task 状态类型和 `TasksService` 状态转换规则。
- 基础设施：Repository 增加条件更新和事件写入事务。
- 测试：增加 DTO/Service 单元测试、Repository 集成测试和并发 E2E 测试。

## Non-Goals

- 不引入认证授权、用户归属或跨任务事务。
- 不实现批量状态更新、任务删除或事件查询 API。
- 不保证跨多个数据库实例的分布式锁；本阶段使用数据库条件更新实现乐观并发控制。
