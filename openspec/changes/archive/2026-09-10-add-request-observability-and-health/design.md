## Context

第五阶段已经完成身份认证、项目授权和任务事务。下一阶段需要先补齐基础横切能力，让请求失败可关联、服务状态可探测，同时不把业务模块绑定到 Fastify 专属对象或外部可观测平台。

## Goals / Non-Goals

**Goals:**

- 使用全局 `NestInterceptor` 观察成功和异常请求，并在请求上下文中保存请求标识。
- 使用全局 `ExceptionFilter` 保持已有错误字段，同时补充请求标识并隐藏未知异常细节。
- 使用独立 `HealthModule` 和 `HealthService` 检查 Prisma 数据库连接。
- 通过 Fastify `app.inject()` 验证真实 header、状态码和响应契约。

**Non-Goals:**

- 不实现限流、OpenTelemetry、日志外发、指标采集或 OpenAPI。
- 不将健康检查复用为业务 Repository 查询；健康检查只验证基础设施连通性。

## Decisions

### 1. 全局拦截器生成请求标识并记录日志

`RequestLoggingInterceptor` 在 Controller 执行前读取合法的 `x-request-id`，非法或缺失时使用 `randomUUID()` 生成，并通过 Fastify Reply 设置响应头。成功请求在 `tap` 中记录，异常请求在 `catchError` 中按 `HttpException` 状态记录后重新抛出。日志使用 JSON 字符串交给 Nest `Logger`，只记录请求元数据，不记录 header 和 body。

### 2. 过滤器只扩展错误契约

`HttpExceptionFilter` 使用 Nest `HttpException` 判断业务异常；已有的 `message`、`error` 和状态码保持不变，只增加 `requestId`。未知异常统一映射为 500 和通用信息，避免把数据库、文件路径或堆栈泄露给客户端。Fastify 适配只停留在 `FastifyReply.status().send()`，不使用 Express response API。

### 3. 健康检查直接依赖 PrismaService

`HealthModule` 通过既有全局 `DatabaseModule` 注入 `PrismaService`，执行 `SELECT 1`。数据库查询失败时抛出 `ServiceUnavailableException`，由全局过滤器补充请求标识。健康端点不挂载认证 Guard，便于负载均衡器和容器探针调用。

## Risks / Trade-offs

- [每个健康请求都会访问数据库] -> 使用单条轻量查询；后续若引入缓存或多依赖检查，再单独设计探活频率和超时。
- [请求标识可能被上游伪造] -> 只透传限定字符集且不超过 128 字符的值；标识用于关联日志，不承担认证或授权。
- [全局错误格式变化影响客户端解析] -> 只增加 `requestId` 字段，保留已有状态码、错误名和消息结构，并用 E2E 锁定兼容性。

## Migration Plan

1. 新增可观测性与健康检查规格、服务和全局 Nest 组件。
2. 在根模块注册 `HealthModule`，在 bootstrap 注册全局拦截器和过滤器。
3. 增加单元测试与 Fastify E2E 测试，验证数据库成功和失败路径。
4. 运行 lint、单元测试、集成测试、E2E、构建、OpenSpec validate 和 diff 检查。

## Fastify Compatibility

拦截器和过滤器分别依赖 Nest 的 `ExecutionContext`/`CallHandler` 与 Fastify 的 `FastifyRequest`/`FastifyReply` 类型；测试继续使用 `app.inject()`，不引入 Express middleware 或 response 方法。
