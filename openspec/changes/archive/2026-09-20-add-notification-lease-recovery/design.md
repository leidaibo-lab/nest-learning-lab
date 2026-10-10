# 设计

## 模块与状态边界

- `NotificationsModule` 继续拥有后台通知处理器；HTTP Controller 不参与租约管理。
- `NotificationProcessor` 使用 PostgreSQL 的 `NotificationJob` 作为权威状态，`leaseUntil` 表示当前实例对一次处理尝试的临时所有权。
- 任务状态只沿用 `pending`、`processing`、`completed` 和 `failed`；租约过期不会新增状态，而是允许从 `processing` 回到下一次 `processing` 尝试。

## 认领流程

```text
查询 pending 到期任务
       或 processing 租约过期任务
                 |
                 v
条件更新 status + attempts + leaseUntil
                 |
       count = 1 才获得处理权
```

查询结果可能在条件更新前被其他实例抢走，因此 `findFirst` 只负责降低竞争范围，`updateMany` 的状态和时间条件才是最终仲裁。租约时长固定 30 秒，当前通知处理没有续租机制，必须让租约明显长于一次正常处理耗时。

## 故障模型与幂等

- 实例在认领后立即崩溃：租约到期后由其他实例恢复。
- 原实例处理超过租约：可能与恢复实例并发执行；通知写入依靠唯一约束和 `skipDuplicates`，最终任务状态由最后一次有效处理写入。
- 数据库暂时不可用：沿用现有有限重试和退避；重试中的任务也持有租约，避免同一实例尚未记录失败时被其他实例同时认领。
- 正常完成或最终失败：清空租约，防止结束任务再次符合回收条件。

## 数据库设计

`notification_jobs.lease_until` 使用可空时间戳：`pending` 尚未被认领时为空，`processing` 必须是未来时间，结束状态为空。增加 `(status, lease_until)` 索引支持恢复扫描；原有 `(status, available_at)` 索引保留给新任务扫描。

## 选择与取舍

- 继续使用 PostgreSQL 条件更新，保持当前事务 outbox 的权威数据源，避免本阶段同时引入 Redis 的连接、部署和故障模型。
- 不使用数据库锁长时间包住通知生成，因为外部处理和多行写入会放大锁持有时间；租约把所有权持久化为可观察状态。
- 不实现租约续期。续期会引入心跳、时钟和停顿处理等新边界，留给后续队列化阶段。

## Fastify 兼容性

本次只修改后台 Provider 和 Prisma 模型，不触碰 Fastify 请求对象及 HTTP 契约；现有 `app.inject()` E2E 契约保持不变。
