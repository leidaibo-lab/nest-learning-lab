# 运行时观测

静态架构图回答“代码如何连接”，运行时观测回答“这一次请求或后台任务实际经过了什么”。

```mermaid
flowchart LR
    Client[客户端] --> Fastify[Fastify HTTP]
    Fastify --> Interceptor[RequestLoggingInterceptor<br/>生成或透传 requestId]
    Interceptor --> Guards[ThrottlerGuard<br/>认证与租户/项目授权]
    Guards --> Pipe[ValidationPipe]
    Pipe --> Controller[Controller]
    Controller --> Service[Service]
    Service --> Database[(PostgreSQL)]
    Database --> Response[HTTP 响应]
    Interceptor --> Logs[结构化 HTTP 日志<br/>method path statusCode durationMs]
    Controller -.异常.-> Filter[HttpExceptionFilter<br/>响应 requestId]
    Scheduler[NotificationProcessor<br/>后台通知处理] --> Database
    Scheduler --> JobLogs[通知处理日志<br/>任务 重试 租约异常]
    Live[GET /health/live] --> Health[HealthService]
    Ready[GET /health/ready] --> Health
    Health --> Database
    Shutdown[beforeApplicationShutdown<br/>draining=true] --> Ready
    Shutdown --> Scheduler
    Docs[/docs 与 /docs-json] -.接口观测.-> Controller
```

## 本地观察

```bash
# 启动应用并观察终端中的 HTTP 与后台处理日志
pnpm run start:dev

# 只检查进程是否仍能响应，不访问数据库
curl -i http://localhost:3000/health/live

# 检查实例是否可接收流量，会执行轻量数据库查询
curl -i http://localhost:3000/health/ready

# 用固定 requestId 关联响应、错误响应和服务端日志
curl -i -H 'x-request-id: local-debug-001' http://localhost:3000/health
```

## 排障路径

1. 从响应头或错误 JSON 取得 `x-request-id`。
2. 在应用终端日志中查找对应的 `http.request` 记录。
3. 结合 `method`、`path`、`statusCode` 和 `durationMs` 判断请求在哪一层失败或变慢。
4. 异步通知不属于 HTTP 请求，使用日志中的任务 ID、尝试次数和处理状态追踪；必要时结合数据库中的 `eventId` 查询任务事件。
5. 用 `/health/live` 区分进程是否存活，用 `/health/ready` 判断数据库是否允许实例继续接收流量。
6. 收到 `SIGTERM` 后检查 `/health/ready` 是否变为 `503`，再确认通知处理器停止新认领并等待当前任务结束。

接口结构可在 `http://localhost:3000/docs` 查看，机器可读契约在 `http://localhost:3000/docs-json` 获取。

## 当前边界

当前已有请求日志、健康状态、接口契约和后台处理日志。通知背压通过批次上限、`setImmediate` 和测试观察，尚未暴露 backlog、处理耗时或数据库压力指标。项目也尚未接入 Prometheus 指标、分布式 Trace 或独立日志查询服务。

停机排空由 `ApplicationLifecycleService` 维护进程内状态：`draining` 只表示当前实例不再接收新流量，不表示数据库或其他实例整体不可用。终止宽限期仍由部署系统配置，并需要依据通知处理耗时和故障演练校准。

## 实现入口

- 请求日志：[`src/observability/request-logging.interceptor.ts`](../../src/observability/request-logging.interceptor.ts)
- 异常响应：[`src/observability/http-exception.filter.ts`](../../src/observability/http-exception.filter.ts)
- 健康检查：[`src/health/health.controller.ts`](../../src/health/health.controller.ts)
- 生命周期状态：[`src/lifecycle/application-lifecycle.service.ts`](../../src/lifecycle/application-lifecycle.service.ts)
- OpenAPI：[`src/openapi.ts`](../../src/openapi.ts)
