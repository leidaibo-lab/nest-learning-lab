## Why

当前应用已经具备认证、授权、持久化和事务能力，但线上排查请求失败仍缺少统一的请求标识，异常响应也没有关联上下文；服务启动后无法通过标准接口判断数据库是否可用。工程横切能力阶段先建立一条可观测、可探活的基础链路，学习 NestJS 全局拦截器、异常过滤器、Logger 和模块化健康检查的请求生命周期落点。

## What Changes

- 为每个 HTTP 请求生成或透传安全的 `x-request-id`，并在响应和异常响应中返回。
- 通过全局拦截器输出不包含敏感数据的结构化 HTTP 请求日志，记录方法、路径、状态码和耗时。
- 通过全局异常过滤器统一补充 `requestId`，对未知异常隐藏内部错误细节。
- 新增未鉴权的 `GET /health`，使用 Prisma 查询验证数据库连通性；数据库不可用时返回 HTTP 503。
- 增加对应的单元测试、HTTP E2E 测试和学习文档。

## Capabilities

### New Capabilities

- `request-observability`: 定义请求标识、结构化请求日志和统一异常响应。
- `service-health`: 定义应用健康检查和数据库依赖检查。

## Impact

- 模块：新增 `HealthModule`；在根应用注册全局请求拦截器和异常过滤器。
- HTTP：新增 `GET /health`；所有 HTTP 响应增加可关联的 `x-request-id`，异常响应增加 `requestId`。
- 运行时：健康检查会执行一次轻量数据库查询；请求日志输出到 Nest Logger。
- 测试：新增横切能力单元测试，扩展 Fastify E2E 测试验证成功、异常和数据库健康场景。

## Non-Goals

- 不在本次变更实现限流、审计事件查询、OpenAPI 文档或分布式追踪协议。
- 不修改已有业务错误的 HTTP 状态码和主要 `message` 内容。
- 不引入 `@nestjs/terminus` 等额外健康检查依赖；后续可在指标和多依赖检查增多时评估。
