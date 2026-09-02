## Context

TasksService 已依赖 `TaskRepository` interface 和 `TASK_REPOSITORY` Token，因此数据库接入应当只改变基础设施 Provider，不改变 Controller 或 Service 的公共调用方式。当前 Task 使用 ISO 字符串表示 `createdAt`，Prisma/PostgreSQL 使用 DateTime，需要在 Repository 边界完成映射。

## Goals / Non-Goals

**Goals:**

- 用版本化迁移建立 PostgreSQL Task 表。
- 通过 ConfigModule 校验 `DATABASE_URL`。
- 用 DatabaseModule 封装 Prisma Client 生命周期。
- 通过 Provider Token 替换 Repository 实现。
- 用真实数据库集成测试验证映射与持久化。

**Non-Goals:**

- 不改变现有 HTTP 请求与响应结构。
- 不在应用启动时隐式执行 migration。
- 不实现任务更新、事务或乐观锁；这些需要独立业务规格。

## Decisions

### 1. 使用 Prisma 6 与 PostgreSQL 17

Prisma 提供显式 schema、版本化 migration 和类型安全 Client，适合观察应用模型与数据库模型之间的映射。固定主版本 6，避免把 Prisma 7 的配置体系迁移混入本阶段。PostgreSQL 使用官方 17 Alpine 镜像。

### 2. DatabaseModule 全局提供 PrismaService

DatabaseModule 负责创建和导出 PrismaService，PrismaService 通过 Nest 生命周期钩子连接与断开数据库。全局模块让功能模块无需重复导入数据库基础设施，同时保持依赖来源可追踪。

### 3. Repository 映射 Date 为 ISO 字符串

数据库层使用原生 DateTime，领域/HTTP Task 保持 `createdAt: string`。PrismaTaskRepository 在返回边界调用 `toISOString()`，避免数据库类型泄漏到 Service 与 Controller。

### 4. 测试分层

Service 单元测试继续绑定 InMemoryTaskRepository，保证快速且聚焦业务。PrismaTaskRepository 集成测试连接真实 PostgreSQL并在用例间清理 Task 表。E2E 测试使用真实数据库，新增“关闭并重建应用实例后仍可查询”的场景。

### 5. 显式环境配置

ConfigModule 在 AppModule 中全局注册并校验 `DATABASE_URL`。仓库只提交 `.env.example`，不提交真实凭据。本地 Compose 使用与示例一致的开发凭据，并映射宿主机 `5433`，避免占用常见的本地 PostgreSQL `5432` 端口。

## Risks / Trade-offs

- [测试依赖 Docker/PostgreSQL，速度变慢] → 单元测试仍使用内存实现；数据库测试单独分层并串行运行。
- [Prisma Client 生成物与 schema 不一致] → install/build 前执行显式 `prisma generate`，迁移和生成命令写入 package scripts。
- [开发凭据被误用于生产] → `.env.example` 明确仅限本地，生产必须注入独立 `DATABASE_URL`。
- [全局 DatabaseModule 隐藏依赖] → TasksModule 仍显式构造 PrismaTaskRepository，设计文档记录 Provider 来源。

## Migration Plan

1. 启动本地 PostgreSQL 容器。
2. 配置 `DATABASE_URL`。
3. 执行 `pnpm prisma:migrate:deploy`。
4. 启动应用并运行集成/E2E 测试。

回滚应用时可重新绑定 InMemoryTaskRepository；数据库迁移不自动回滚，开发环境可删除 Compose volume 后重建。

## Open Questions

- 任务更新与事务边界将在持久化基础稳定后，以独立 OpenSpec 变更设计。

## 实施回顾

- Git 变更检索确认 `TasksController`、`TasksService` 和 `TaskRepository` 无需修改；生产 Provider 只在 `TasksModule` 将 `useClass` 从内存实现替换为 Prisma 实现。
- 新增 ConfigModule、DatabaseModule 与 PrismaService，连接配置和客户端生命周期由基础设施层集中管理。
- PostgreSQL 17 容器映射至宿主机 5433，避免影响已有占用 5432 的数据库容器；初始 migration 已成功部署。
- PrismaTaskRepository 集成测试 2 个用例通过；真实数据库 E2E 测试 9 个用例通过，其中跨 Nest 应用实例查询验证了持久化行为。
- 单元测试保持使用 InMemoryTaskRepository，共 4 个套件、13 个用例通过，不依赖数据库。
- 首次安装的 `@nestjs/config` 12.x 为 ESM 包，与当前 Jest CommonJS 配置不兼容，已调整为 NestJS 11 配套的 4.x。
- lint、构建、Prisma Client 生成、migration 状态和 OpenSpec 校验均通过。
