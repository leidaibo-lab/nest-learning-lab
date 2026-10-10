# 设计

## 生命周期状态

- `ApplicationLifecycleService` 由 `HealthModule` 提供并导出，保存进程内的 `draining` 状态和关闭信号。
- `beforeApplicationShutdown` 一旦执行就进入 draining；这发生在模块销毁前，作为探针和后台 Provider 的共同事实源。
- `HealthService.checkReadiness()` 先检查 draining，再访问数据库；排空期间直接返回 503，避免探针访问已经不应承接流量的实例。
- `HealthService.liveness()` 不读取 draining，进程在排空期间仍可返回 200，方便运行时区分“正常退出”与“失去响应”。

## 通知处理顺序

```text
SIGTERM
  -> beforeApplicationShutdown: draining = true
  -> /health/ready 返回 503
  -> NotificationProcessor 停止新调度/认领
  -> 当前 processJob 完成或按已有租约规则收敛
  -> NotificationProcessor onModuleDestroy 等待 activeRun
  -> PrismaService onModuleDestroy 断开连接
```

处理循环在每次任务边界重新检查 draining；停机发生在任务处理中时允许当前任务走完，但不会再认领下一任务。已写入数据库的通知副作用仍由唯一约束和租约令牌围栏保护。

后台循环自身捕获数据库查询异常并延迟重试，避免数据库暂时不可用时产生未处理 Promise rejection；进入 draining 后不再安排恢复调度。

## 故障模型与容量假设

- 如果进程在 draining 标记后立即被强制终止，当前任务可能中断，后续实例依靠租约过期恢复；本阶段不承诺事务外的恰好一次完成。
- 如果当前任务处理时间超过部署终止宽限期，编排器可能强制终止进程；宽限期必须依据任务耗时分位数和故障演练校准。
- 就绪探针返回 503 只表达本实例不应接收新流量，不表示其他实例或数据库整体不可用。

## Fastify 兼容性

本次不改变 Fastify 路由适配方式；继续使用 Nest shutdown hooks 和 `app.inject()` 契约测试验证 HTTP 行为。
