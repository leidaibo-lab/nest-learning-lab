# 设计：异步任务通知

## 模块边界

- `TasksModule` 继续拥有任务状态业务规则和状态事务；`PrismaTaskRepository` 在事务内写入 `TaskEvent` 与 `NotificationJob`。
- `NotificationsModule` 负责通知查询、通知任务处理和后台调度，不被 Controller 直接调用来改变任务状态。
- `NotificationProcessor` 通过 `OnModuleInit` 启动一次待处理任务扫描，并由 `NotificationScheduler` 使用 `setImmediate` 触发后续扫描。HTTP 请求只负责提交持久化任务，不等待通知生成。

## Provider 关系

```text
TasksService
  -> TASK_REPOSITORY
     -> PrismaTaskRepository
        -> Prisma transaction(Task + TaskEvent + NotificationJob)
  -> NotificationScheduler
     -> NotificationProcessor
        -> Prisma(NotificationJob + ProjectMember + Notification)

NotificationsController
  -> JwtAuthGuard
  -> NotificationsService
     -> Prisma(Notification where userId = current user)
```

## 可靠性决策

数据库中的 `NotificationJob` 作为轻量 outbox：任务状态和异步工作在一个事务中提交，避免进程在提交状态后、发布内存事件前崩溃导致通知丢失。Processor 先用条件更新将任务从 `pending` 抢占为 `processing`，再处理业务，适配多个应用实例竞争消费。

通知使用 `(userId, taskEventId)` 唯一约束和 `createMany({ skipDuplicates: true })` 实现幂等。失败时按 1、2、4 秒退避，第三次失败后标记 `failed` 并保留 `lastError`，后续可由运维工具人工重放。

## Fastify 兼容性

通知 Controller 只使用 Nest HTTP 装饰器和当前用户 Decorator，不依赖 Express 请求对象；后台 Processor 与 HTTP 平台无关，因此继续使用现有 Fastify `app.inject()` 测试。

## 替代方案

本次暂不引入 BullMQ/Redis：项目尚未有 Redis 生命周期和部署配置，先用 PostgreSQL outbox 展示事务、重试和幂等的核心边界。后续引入 BullMQ 时可保留 `NotificationJob` 作为业务事实或迁移为队列适配器，而不改变通知查询契约。
