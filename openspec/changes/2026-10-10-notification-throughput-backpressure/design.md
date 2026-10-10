# 设计

## 处理边界

- `NotificationProcessor` 继续是 `NotificationsModule` 内的后台 Provider，HTTP Controller 不参与背压调度。
- 单次 `processPending` 最多处理 50 个任务；处理到上限后由 `setImmediate` 排队下一批。
- `processing` 仍是实例内互斥标记，因此同一 Provider 不会因为续批而产生本地并发消费。

## 为什么先限制批次

当前处理器每个任务都要访问任务事件、项目成员和通知表。无限 drain 会把 backlog 转化为长时间的数据库压力，并延迟事件循环处理 HTTP 请求、SIGTERM 和租约续期回调。固定批次让出调度权可以改善公平性和停机响应，但不能降低单任务成本，也不能替代跨实例限流。

## 故障模型与容量假设

- `setImmediate` 只能提供同一 Node.js 实例内的调度让步；事件循环或数据库持续阻塞时，仍可能无法按时续租。
- 批次耗尽后任务仍保留在 PostgreSQL outbox 中，下一批继续通过条件认领和租约围栏处理。
- `MAX_JOBS_PER_RUN=50` 是学习用起点，不代表每秒吞吐。后续必须用 backlog 深度、任务处理耗时分位数、数据库连接/锁等待和 SIGTERM 延迟校准。

## Fastify 兼容性

本次只调整后台处理循环，不改变 Fastify 请求对象、路由或响应契约；现有 `app.inject()` E2E 测试继续作为 HTTP 回归证据。
