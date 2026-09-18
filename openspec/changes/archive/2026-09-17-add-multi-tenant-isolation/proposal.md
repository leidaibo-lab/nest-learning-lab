# 多租户与数据隔离

## Why

当前授权边界以项目成员为中心，但用户、项目、任务和通知还没有共同的组织边界。随着同一用户加入多个组织，仅依赖项目 ID 或用户 ID 容易在新增查询、后台任务和数据迁移中漏掉租户过滤，形成跨租户数据泄露风险。

本次增量开启复杂生产系统能力阶段，学习目标是理解租户上下文如何从 HTTP 请求进入 Guard，再经过 Service 和 Repository 到达持久化与异步通知边界。

## What Changes

- 增加 `Tenant` 和 `TenantMember` 模型；注册用户自动获得一个默认组织，也可以创建新的组织。
- 使用 `x-tenant-id` 选择请求租户；用户只有一个组织时允许自动解析，多个组织时必须显式选择。
- 让项目、任务仓储和通知查询强制携带租户范围，并把租户标识写入任务事件、通知 outbox 和通知载荷。
- 增加复合索引/约束、历史数据迁移回填和跨租户 E2E 验证。
- 在请求上下文、Guard、Repository 和后台处理器的责任边界补充中文学习注释。

## Non-Goals

- 不实现 PostgreSQL RLS、微服务拆分、计费、跨租户共享或完整组织管理后台。
- 不实现租户停用、成员邀请审批和租户级管理员权限；本次只保留 `owner`/`member` 两种租户角色。

## Impact

- 模块：新增 `TenantsModule`，调整 Auth、Projects、Tasks、Notifications 和 AppModule。
- HTTP：新增 `POST /tenants`、`GET /tenants`；受保护业务请求支持并要求 `x-tenant-id` 选择租户。
- 数据库：新增 tenants/tenant_members，给 projects、task_events、notification_jobs、notifications 增加租户归属及索引。
- 测试：新增租户上下文单元测试、Repository 集成测试和跨租户 E2E 测试。
