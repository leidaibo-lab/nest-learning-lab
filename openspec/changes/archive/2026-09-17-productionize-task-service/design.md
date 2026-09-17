## Context

异步通知已经引入后台 Provider 和数据库 outbox；生产化需要保证应用交付环境不会改变这些生命周期假设。当前项目使用 pnpm、Prisma migration 和 Fastify，因此方案沿用现有脚本和健康检查，不额外引入容器平台 SDK。

## Decisions

### 1. 多阶段 Node 镜像

依赖阶段使用 `pnpm install --frozen-lockfile`，build 阶段编译 TypeScript，production 阶段只安装生产依赖并复制 `dist`、`generated` 和 `prisma`。这样 lockfile 是依赖可重复性的边界，编译工具不会进入最终运行层。

### 2. Entrypoint 负责 migration

启动入口使用 `set -eu`，先执行 `pnpm prisma:migrate:deploy`，再通过 `exec` 将 Node 进程置为 PID 1。`exec` 让 Docker 的 `SIGTERM` 直接到达 Nest，迁移失败也不会启动半可用应用。

### 3. Compose 与 CI 负责外部依赖

生产 Compose 使用 PostgreSQL healthcheck 和 `depends_on.condition: service_healthy`；CI 使用 GitHub Actions service container。二者都通过环境变量注入凭据，不把真实 Secret 放进镜像或仓库。

### 4. Nest shutdown hooks 负责内部顺序

`app.enableShutdownHooks()` 将操作系统停止信号接入 Nest 生命周期。已有 `NotificationProcessor.onModuleDestroy` 会停止调度并等待 `activeRun`，随后 `PrismaService.onModuleDestroy` 断开连接，形成“停止新工作 -> 等待数据库操作 -> 断开连接”的顺序。

## Risks / Trade-offs

- [单实例 entrypoint 并发迁移] -> Prisma migration deploy 通过数据库迁移锁协调；生产部署仍应避免无必要的重复发布。
- [容器停止等待时间不足] -> 编排平台需将 termination grace period 配置为覆盖最长通知处理时间；本次不强行修改平台默认值。
- [CI 命令与 package script 漂移] -> CI 直接复用现有 pnpm scripts，并在构建步骤验证生产编译。

## Fastify Compatibility

应用监听地址使用 Nest `listen(port, host)`，不依赖 Express API。健康检查和现有 E2E 继续通过 Fastify `app.inject()` 验证，容器只改变进程包装方式。
