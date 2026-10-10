# 设计

## 模块与状态边界

- `NotificationsModule` 继续拥有后台处理器，HTTP Controller 不参与租约心跳。
- `NotificationJob` 的 `leaseToken` 是一次处理尝试的围栏令牌，`leaseUntil` 是临时处理权的过期时间；两者都由 PostgreSQL 作为权威状态保存。
- 任务仍沿用 `pending`、`processing`、`completed` 和 `failed`，续租不增加任务状态。

## 处理流程

```text
条件认领 -> 生成 leaseToken + leaseUntil
       |
       +--> 定时续租（id + processing + token + 未过期）
       |
       +--> 产生通知副作用
       |
       +--> 条件完成/失败（同一 token + 未过期）
```

处理器使用 `setInterval` 发起续租，并在通知写入前主动续租一次。完成和失败改用 `updateMany`，用影响行数判断当前实例是否仍有处理权。续租或终态更新失败时，旧实例不再改变任务状态；通知写入仍依靠唯一约束保持幂等。

## 故障模型与容量假设

- 实例在续租间隔内崩溃：租约到期后可被新实例回收。
- Node.js 事件循环长时间暂停或数据库不可用：续租可能失败，令牌围栏阻止旧实例提交终态。
- 实例处理时间超过 30 秒但续租正常：租约可继续有效；若续租停止，最多在一个租约周期后恢复。
- 当前 `LEASE_DURATION_MS=30s`、`LEASE_RENEW_INTERVAL_MS=10s` 只适用于轻量通知生成和当前故障恢复目标，不代表容量承诺；后续必须通过耗时分位数、数据库压力和故障演练重新校准。

## 选择与取舍

- 使用随机 UUID 令牌而不是实例名，避免同一实例并发尝试或重启后复用处理权。
- 保留 PostgreSQL 条件更新，复用上一阶段的多实例仲裁，不引入新的协调服务。
- 不在本阶段实现动态配置和无限续租；这两个能力需要指标、停顿检测和运维策略支撑。

## Fastify 兼容性

本次只修改后台 Provider、Prisma 模型和迁移，不触碰 Fastify 请求对象及 HTTP 契约；现有 `app.inject()` E2E 测试继续作为回归证据。
