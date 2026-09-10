## Context

当前应用已经通过 Prisma 持久化任务，但 Task 没有用户或项目归属，所有任务路由也没有身份边界。本阶段需要跨越认证、项目成员、任务领域和数据库迁移，形成可由 E2E 验证的“登录后按项目访问任务”链路，同时保持 Controller → Service → Repository 的现有依赖方向和 Fastify `app.inject()` 测试方式。

## Goals / Non-Goals

**Goals:**

- 建立 `AuthModule`、`ProjectsModule` 与任务模块之间清晰的依赖边界。
- 使用 NestJS `CanActivate` Guard 完成认证和项目成员授权，并用自定义 Decorator 读取当前用户、声明 owner 角色。
- 持久化用户、项目、项目成员及任务项目外键。
- 通过注册、登录、创建项目、邀请成员和任务操作 E2E 验证 401/403/404/409 契约。

**Non-Goals:**

- 不实现 Refresh Token、密码重置、OAuth、成员移除和项目删除。
- 不把权限判断下沉为 Prisma 查询魔法；由授权服务表达成员关系，Repository 负责数据边界。

## Decisions

### 1. 使用模块化 JWT 服务而非全局隐式认证

`AuthModule` 提供 `PasswordService` 和 `JwtService`，`JwtAuthGuard` 只负责读取 Bearer Token、验签和加载用户身份，`@CurrentUser()` Decorator 从请求上下文读取认证结果。采用 Node 内置 `crypto` 实现 HS256 和 `scrypt`，因为当前项目没有 JWT/Passport 依赖且本阶段重点是 Guard 生命周期；生产替代方案是 `@nestjs/jwt` + Passport Strategy。

### 2. 认证和授权拆成两个 Guard

`JwtAuthGuard` 只证明“是谁”，`ProjectAccessGuard` 通过任务/项目标识查询成员关系并证明“能否访问”。项目成员 Controller 使用 `@Roles('owner')` 声明邀请成员所需角色，`RolesGuard` 只处理角色元数据。这避免把身份校验和业务权限规则揉进 Controller。

### 3. 项目归属成为 Task 的持久化约束

Task 增加 `projectId` 外键和索引；创建任务从 DTO 获取项目，查询和状态更新通过任务反查项目成员。项目创建和 owner 成员插入使用同一个 Prisma 事务，避免出现没有 owner 的项目。

### 4. 密码只保存哈希，错误登录统一返回 401

密码使用随机 salt 的 `scrypt` 哈希保存，比较使用 timing-safe 检查。登录对未知邮箱和错误密码统一走相同的 `UnauthorizedException`，响应不泄露账户存在性。

### 5. Fastify 兼容性通过请求注入验证

Guard 只依赖 Nest `ExecutionContext` 和标准 Request headers，不使用 Express 专属 API；E2E 继续使用 Fastify `app.inject()` 验证真实 header、路由和错误状态。

## Risks / Trade-offs

- [自实现 JWT 容易遗漏标准细节] → 限定为 HS256、固定算法、校验 exp/iat/签名，并在测试中覆盖篡改和过期 Token；后续生产化阶段替换成熟库。
- [新增认证要求破坏旧任务客户端] → 在迁移说明和 E2E fixture 中明确 Token 与 `projectId` 为必填，采用前向 migration。
- [项目成员查询增加数据库往返] → 本阶段优先保持授权边界清晰，后续可在不改变 Guard 契约的前提下批量查询或缓存。
- [数据库迁移无法自动给既有任务补项目] → 开发数据库无既有业务数据；若部署到已有数据，迁移前必须由运维提供归属项目回填策略。

## Migration Plan

1. 扩展 Prisma schema，新增 User/Project/ProjectMember，给 Task 增加 projectId，并生成前向 migration。
2. 增加 `JWT_SECRET` 配置校验，接入 AuthModule 和 ProjectsModule。
3. 接入认证/授权 Guard，修改任务 DTO、领域模型和 Repository。
4. 更新单元、集成和 E2E 测试，执行 lint、test、integration、e2e 和 build。
5. 回滚应用时保留新增表和字段；不手工修改已应用 migration，已有任务数据需通过新的回填 migration 处理。

## Open Questions

- 后续生产化阶段是否改用 `@nestjs/jwt` 和 Passport Strategy，待本阶段 Guard 行为稳定后评估。
- 成员角色是否扩展为 reviewer/admin，留到项目协作能力阶段评估。
