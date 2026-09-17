## Context

生产化阶段已经固定了 Docker、CI 和优雅停机；下一步需要让接口能够被客户端发现，同时保护认证入口免受短时间重复请求。项目使用 Fastify，因此文档必须由 Nest 应用实例生成，限流必须通过 Nest Guard 接入请求生命周期，而不是写 Fastify 专属 hook。

## Decisions

### 1. 使用 `@nestjs/swagger` 生成契约

在 `main.ts` 创建 `DocumentBuilder`，通过 `SwaggerModule.createDocument` 从当前 `AppModule` 生成文档，并暴露 `/docs` UI 与 `/docs-json` JSON。Controller 使用 `@ApiTags`、`@ApiOperation`、`@ApiResponse`、`@ApiBearerAuth` 描述边界；DTO 使用 `@ApiProperty` 保持请求模型与 class-validator 定义同源。

### 2. 使用 `@nestjs/throttler` 接入全局 Guard

`ThrottlerModule` 读取 `ConfigService` 中的毫秒窗口和请求上限，`APP_GUARD` 注册 `ThrottlerGuard`，因此限流发生在 Controller 和业务 Service 之前。认证 Controller 通过 `@Throttle` 覆盖默认策略，固定为 5 次/60 秒，避免密码校验和用户写入被反复触发。

### 3. 使用内存存储并明确边界

本阶段使用 Throttler 默认内存存储，适合单实例学习和快速验证；Docker 多副本或多节点部署时计数不会共享，后续若需要分布式限流再引入 Redis storage，不把分布式一致性问题混入本阶段。

### 4. 保持异常与 Fastify 兼容

429 由 Throttler 抛出 `ThrottlerException`，继续经过现有全局异常过滤器并附加 `requestId`。测试使用 Fastify `app.inject()` 访问 `/docs-json` 和重复请求，不引入 Express middleware。

## Risks / Trade-offs

- [内存计数随进程重启丢失] -> 文档明确单实例边界；生产多副本后单独设计共享存储。
- [Swagger 元数据与实现漂移] -> 将关键路径和 DTO 装饰器纳入源码，E2E 读取生成文档验证路径存在。
- [测试请求消耗限额] -> 普通请求默认使用较宽窗口，认证接口用独立测试数据和显式限额验证。

## Migration Plan

1. 扩展环境配置并安装 Swagger/Throttler 依赖。
2. 在 bootstrap 注册文档，在根模块注册配置化全局 Guard。
3. 为 Controller 和 DTO 增加契约元数据，为认证接口增加严格限流装饰器。
4. 增加单元、E2E、lint、构建和 OpenSpec 验证。
