# 测试证据地图

流程图说明系统如何工作，测试证据说明这些判断如何被验证。新增或修改流程时，应在这里补上对应的规格和测试入口。

| 业务或技术边界 | 关键实现 | 规格入口 | 测试入口 |
| --- | --- | --- | --- |
| HTTP 请求生命周期与错误响应 | `main.ts`、全局 Guard/Interceptor/Filter | `openspec/specs/request-observability/spec.md` | `src/observability/*.spec.ts`、`test/app.e2e-spec.ts` |
| 任务状态与乐观并发 | `TasksService`、`PrismaTaskRepository` | `openspec/specs/task-status/spec.md` | `src/tasks/tasks.service.spec.ts`、`test/prisma-task.repository.integration-spec.ts` |
| 多租户上下文和越权边界 | `TenantContextGuard`、项目授权 Guard | `openspec/specs/tenant-isolation/spec.md` | `src/tenants/tenant-context.guard.spec.ts`、`test/app.e2e-spec.ts` |
| 异步通知、重试和幂等 | `NotificationProcessor` | `openspec/specs/task-notifications/spec.md` | `src/notifications/notification.processor.spec.ts`、`test/prisma-task.repository.integration-spec.ts` |
| 存活和就绪探针 | `HealthController`、`HealthService` | `openspec/changes/2026-10-10-health-probes/` | `src/health/health.service.spec.ts`、`test/app.e2e-spec.ts` |
| OpenAPI 契约 | `src/openapi.ts`、各 Controller 元数据 | `openspec/specs/api-contract/spec.md` | `test/app.e2e-spec.ts` |
| 优雅停机和后台任务关闭 | `main.ts`、`NotificationProcessor`、`PrismaService` | `openspec/specs/production-runtime/spec.md` | 生产运行测试与 CI 验证 |

## 阅读规则

- 单元测试适合解释业务规则和失败分支。
- 集成测试适合解释 Prisma、事务、唯一约束和数据库并发边界。
- E2E 测试适合解释 HTTP 状态码、响应体、认证、租户和 OpenAPI 路径。
- 如果流程暂时没有自动化测试，应在对应 OpenSpec design 中明确原因和补验计划。
