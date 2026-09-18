# 设计

## 模块与数据边界

- `TenantsModule` 提供 `TenantsService`、`TenantContextGuard`、`CurrentTenant` 装饰器和租户 HTTP 接口。
- `TenantContextGuard` 依赖 `PrismaService`，在 `JwtAuthGuard` 之后解析 `x-tenant-id`，将 `tenantId` 写入 Fastify request；缺少选择或没有成员关系时在进入业务逻辑前失败。
- `ProjectAccessGuard` 读取同一请求上下文，并用 `tenantId + projectId + userId` 检查项目和成员，防止只凭全局项目 ID 越界。
- `TasksService` 把 `tenantId` 传给 `TaskRepository`；Prisma 实现对 `save`、`findById`、`updateStatus` 的所有读写都带租户条件。
- `NotificationProcessor` 不依赖 HTTP 上下文，而从 `NotificationJob.tenantId` 和事件的租户归属重建后台边界。

## 数据模型

`Tenant` 与 `TenantMember` 使用 `(tenantId, userId)` 复合主键。`Project` 增加 `tenantId`，并使用 `(tenantId, id)` 唯一约束支持显式范围查询；`TaskEvent`、`NotificationJob`、`Notification` 保存租户归属，避免后台任务必须猜测上下文。

迁移先创建可空 `projects.tenant_id`，为已有用户建立默认租户并按项目 owner 回填，再设置非空和外键。新注册用户的默认租户由 AuthService 在用户事务中创建。

## 请求生命周期

```text
Bearer Token -> JwtAuthGuard -> TenantContextGuard -> ProjectAccessGuard -> Controller -> Service -> Repository
```

单租户兼容回退只用于逐步迁移旧客户端；一旦用户拥有多个租户，必须显式传递请求头。租户 ID 不从请求 body 信任，任务的 `projectId` 只作为候选资源 ID，最终由 Guard 和 Repository 共同验证。

## 选择与取舍

- 采用应用层上下文 + Repository 强制参数，便于观察 NestJS 请求生命周期和模块边界；本迭代不引入 RLS，避免把学习重点提前转移到数据库会话变量和连接池复用。
- 使用 UUID 请求头而不是把租户复制到 JWT，避免成员变化后令牌继续携带过期租户授权；JWT 只证明用户身份，租户选择每次请求重新校验。
- 保留全局资源 UUID，同时在查询中显式加入租户条件；这样可以用 404 隐藏跨租户资源存在性，并通过索引控制查询成本。
- Fastify 只承载 header、request params 和 request 装饰数据，不依赖 Express 类型或 middleware 特性。
