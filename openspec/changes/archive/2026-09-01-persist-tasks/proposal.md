## Why

当前任务保存在进程内 Map 中，应用重启后数据会丢失，也无法学习数据库配置、迁移和基础设施集成测试。第三阶段需要在不改变 Controller 和 Service 业务调用方式的前提下，将 Repository Provider 替换为 PostgreSQL 实现，验证第一阶段抽象边界的价值。

## What Changes

- 使用 Docker Compose 提供本地 PostgreSQL 开发数据库。
- 引入 Prisma Client、Prisma CLI 和 Nest ConfigModule。
- 定义 Task 数据模型并创建初始数据库迁移。
- 新增全局 DatabaseModule 和 PrismaService，集中管理连接生命周期。
- 实现 PrismaTaskRepository，并将 TasksModule 的 `TASK_REPOSITORY` 绑定从内存实现替换为数据库实现。
- 保留 InMemoryTaskRepository，仅供快速单元测试使用。
- 增加真实 PostgreSQL Repository 集成测试和跨应用实例 E2E 验证。

## Capabilities

### New Capabilities

- `task-persistence`: 定义任务数据的 PostgreSQL 持久化、迁移和重新连接后的可查询行为。

### Modified Capabilities

- `task-management`: 创建与查询任务的存储从进程内内存变更为 PostgreSQL，但 HTTP 契约保持不变。

## Impact

- 基础设施：新增 `compose.yaml`、`.env.example`、`prisma/schema.prisma` 和迁移文件。
- 应用模块：`AppModule` 导入 ConfigModule 与 DatabaseModule；TasksModule 更换 Repository Provider。
- 依赖：新增 `@nestjs/config`、`@prisma/client` 和开发依赖 `prisma`。
- 测试：单元测试继续使用内存实现；集成和 E2E 测试需要可用的测试数据库。
- 运维：启动应用前需要配置 `DATABASE_URL` 并执行迁移。

## Non-Goals

- 本增量不新增任务更新接口，因此暂不引入业务事务和乐观并发版本字段。
- 不在应用启动时自动执行迁移，迁移由显式 CLI 命令管理。
- 不引入连接池代理、读写分离或生产数据库部署方案。
