## Why

当前 HTTP 接口已经覆盖认证、项目、任务和通知，但客户端只能从源码或手工请求中理解契约；认证入口也没有防止短时间重复尝试的统一保护。第九阶段通过 Nest Swagger 和 Throttler 学习元数据装饰器、全局 Guard、配置注入以及 Fastify 请求 IP 的边界。

## What Changes

- 新增 `GET /docs` Swagger UI 和 `GET /docs-json` OpenAPI JSON 文档。
- 为认证、项目、任务、通知和健康接口补充标签、参数、请求体和响应状态的 OpenAPI 元数据。
- 增加全局可配置请求限流，并为注册、登录接口设置更严格的独立窗口。
- 限流触发时返回 HTTP 429，并沿用现有 requestId 和异常响应契约。
- 增加环境配置、OpenAPI 路由和限流行为的单元/E2E 测试与学习注释。

## Capabilities

### New Capabilities

- `api-contract`: 定义 OpenAPI 文档入口和业务 HTTP 契约描述。
- `request-rate-limit`: 定义全局请求和认证入口的限流行为。

## Impact

- 模块：`AppModule` 增加 ThrottlerModule；`main.ts` 注册 Swagger 文档和全局 ThrottlerGuard。
- HTTP：新增 `/docs`、`/docs-json`；超出限流窗口的请求返回 429；既有业务响应保持不变。
- 配置：新增 `THROTTLE_TTL`、`THROTTLE_LIMIT`，认证接口使用固定的更严格入口策略。
- 依赖：新增 `@nestjs/swagger` 与 `@nestjs/throttler`。
- 测试：扩展 Fastify E2E 验证 OpenAPI 路由、契约路径和 429 响应；补充环境配置单元测试。

## Non-Goals

- 不实现 API Key、OAuth2、请求签名或分布式 Redis 限流存储。
- 不为每个字段建立独立响应 DTO；本阶段先覆盖客户端生成所需的路径、参数、请求体和主要状态码。
- 不改变认证算法、权限规则、业务错误状态码或已有接口路径。
