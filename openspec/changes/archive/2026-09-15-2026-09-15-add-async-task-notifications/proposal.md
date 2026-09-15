# 提案：异步任务通知

## Why

任务状态更新已经产生 `TaskEvent`，但事件目前只停留在数据库审计层，项目成员无法收到后续通知。下一阶段需要把已经存在的领域事件连接到异步处理流程，学习 NestJS Provider 生命周期、后台任务、重试与幂等，同时保持 HTTP 请求不等待通知发送完成。

## What Changes

- 状态更新事务同时写入 `TaskEvent` 和通知任务，避免任务已变更但异步工作丢失。
- 新增后台通知处理器，读取项目成员并创建通知；处理失败时按有限次数重试，超过上限记录失败状态。
- 通过数据库唯一约束保证同一任务事件不会给同一用户重复创建通知。
- 新增认证后的 `GET /notifications`，仅返回当前用户的通知。
- 为关键异步边界增加中文注释，解释事务、异步调度、重试和幂等的原因。

## Non-Goals

- 本次不引入 Redis、BullMQ 或外部消息代理；持久化通知任务先作为学习用的数据库队列。
- 本次不实现 WebSocket、实时推送、未读数缓存、邮件和移动端推送。
- 本次不改变既有任务状态转换和项目成员授权规则。

## Impact

- 模块：`TasksModule` 增加通知任务触发点，新增 `NotificationsModule`、Controller、Service 和后台 Processor。
- 数据库：新增通知任务和用户通知表，以及任务事件到通知任务的一对一关系。
- HTTP：新增需要 Bearer Token 的 `GET /notifications`。
- 测试：补充 Processor 单元测试、通知 Repository/处理器集成测试和 Fastify E2E 测试。
- 依赖：继续使用现有 NestJS、Prisma 和 PostgreSQL，不增加运行时基础设施。
