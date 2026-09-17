# production-runtime Specification

## Purpose

定义任务服务在容器环境中的生产启动、数据库迁移、外部依赖健康检查和优雅停机行为。
## Requirements
### Requirement: 生产镜像可重复构建

系统 MUST 通过多阶段 Docker 构建生成生产镜像；最终镜像 MUST 只包含生产依赖、`dist`、Prisma Client 生成物和 migration 文件，不得依赖宿主机 `node_modules` 或源代码运行。

#### Scenario: 构建生产镜像

- **WHEN** 使用仓库根目录执行 Docker build
- **THEN** 构建使用锁文件安装依赖并生成可执行的 Nest 生产镜像

### Requirement: 数据库迁移先于应用启动

生产容器 MUST 在启动 Nest 进程前执行 `prisma migrate deploy`；迁移失败时 MUST 以失败状态退出，不能继续接收 HTTP 请求。

#### Scenario: 空数据库启动

- **WHEN** PostgreSQL 健康且应用容器首次启动
- **THEN** entrypoint 应用全部版本化 migration 后再启动 `dist/main.js`

#### Scenario: 迁移失败

- **WHEN** 数据库不可用或 migration 执行失败
- **THEN** entrypoint 不启动 Nest 进程并返回非零退出状态

### Requirement: 依赖健康与优雅停机

生产编排 MUST 等待 PostgreSQL 健康后启动应用；应用 MUST 监听 `0.0.0.0`，并在收到 `SIGTERM` 后触发 Nest shutdown hooks，等待活动异步数据库操作结束后再断开 Prisma。

#### Scenario: 容器依赖就绪

- **WHEN** PostgreSQL healthcheck 通过
- **THEN** 应用容器才执行启动入口

#### Scenario: 收到停止信号

- **WHEN** 应用进程收到 `SIGTERM`
- **THEN** Nest 触发 Provider 销毁生命周期，通知处理器停止新任务并等待当前运行，随后 Prisma 断开连接

