## Context

当前 Task 只有 `todo` 状态，Repository 只支持创建和查询。要观察事务和并发控制，需要一个会改变已有记录并产生副作用的业务动作：更新状态时写入操作事件。该动作必须在数据库层原子完成，避免任务状态已变但事件丢失。

## Goals / Non-Goals

**Goals:**

- 增加状态状态转换和 `PATCH /tasks/:id/status`。
- 使用 Task `version` 做乐观并发控制。
- 使用 Prisma 交互式 `$transaction` 同时更新 Task 和创建 TaskEvent。
- 保持 Controller → Service → Repository 的依赖方向。
- 用并发 E2E 和集成测试验证单写入成功与事件原子性。

**Non-Goals:**

- 不实现认证授权、批量操作、事件查询或分布式锁。
- 不把 Prisma TransactionClient 暴露到 Service 或 Controller。

## Decisions

### 1. 版本号条件更新

Task 增加 `version Int @default(1)`。Repository 在事务中先读取当前记录，再使用 `where: { id, version: expectedVersion }` 执行 `updateMany`。受影响行数为 0 时区分任务不存在和版本冲突。相比直接 `update`，条件更新可以安全检测并发请求。

### 2. 事务边界位于 Prisma Repository

`$transaction` 属于数据库基础设施能力，因此放在 `PrismaTaskRepository`，Service 只表达状态规则和错误映射。相比把 Prisma TransactionClient 传入 Service，这样可以继续替换 ORM，并保持业务层不依赖 Prisma。

### 3. 事件记录作为事务内副作用

成功更新后在同一个事务中创建 TaskEvent，记录 `fromStatus`、`toStatus`、`version` 和 `createdAt`。如果事件写入失败，事务回滚 Task 更新，保证后续通知/审计可以依赖事件完整性。

### 4. 状态转换规则位于 Service

Service 根据领域状态图拒绝非法转换；Repository 只负责持久化和并发条件。当前允许：`todo → in_progress/done`、`in_progress → todo/done`，`done` 为终态。

## Risks / Trade-offs

- [事务中先读后写存在竞态] → `updateMany` 使用 id + version 条件做最终 CAS，竞态请求返回冲突。
- [TaskEvent 表持续增长] → 本阶段只记录，不实现查询和归档；后续审计能力单独设计。
- [状态字符串仍由应用约束] → 当前状态集合较小；后续可改为 PostgreSQL enum 或独立领域值对象。
- [内存 Repository 无真正事务] → 单元测试只验证接口行为；事务一致性由 PostgreSQL 集成测试覆盖。

## Migration Plan

1. 修改 Prisma schema，增加 Task.version 和 TaskEvent 模型。
2. 创建并部署版本化 migration。
3. 扩展 Repository、Service、DTO 和 Controller。
4. 运行单元、集成、E2E、lint 和构建验证。

回滚应用代码时保留新增字段和表不会影响已有创建/查询；若需要数据库回滚，应通过新的前向 migration 处理，不手动修改已应用 migration。

## Open Questions

- 是否需要把状态集合迁移为 Prisma/PostgreSQL enum，留到状态模型稳定后评估。
