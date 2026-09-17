## Why

当前应用已经具备数据库、认证、健康检查和异步处理，但只能依赖开发机命令启动，缺少固定的运行镜像、迁移前置、CI 门禁和容器停止流程。下一阶段通过同一套任务服务学习 NestJS 生命周期与生产交付边界。

## What Changes

- 增加多阶段 Dockerfile，生成只包含生产依赖、编译产物和 Prisma 运行文件的应用镜像。
- 增加容器 entrypoint，在 Nest 进程启动前执行版本化 Prisma migration。
- 增加生产 Compose 编排，等待 PostgreSQL 健康后启动应用，并配置自动重启。
- 增加 GitHub Actions CI，执行安装、迁移、lint、单元测试、集成测试、E2E 测试和构建。
- 开启 Nest shutdown hooks，让 `SIGTERM` 触发通知处理器和 Prisma 的有序销毁。
- 更新学习路线和部署运行手册，补充生产化关键代码注释。

## Capabilities

### New Capabilities

- `production-runtime`: 定义生产镜像、数据库迁移前置、健康依赖和优雅停机行为。
- `continuous-integration`: 定义提交和合并请求必须通过的自动化验证门禁。

## Impact

- 运行时：新增 Docker 镜像入口和生产 Compose 文件；应用监听所有容器网卡。
- Nest 模块：`main.ts` 开启关闭钩子；`PrismaService` 和已有通知处理器参与关闭生命周期。
- CI：新增 GitHub Actions 工作流及 PostgreSQL 服务容器。
- 文档：更新 README、学习路线和 OpenSpec 稳定规格。
- 测试：保留现有业务测试，增加启动配置与生产文件的静态验证。

## Non-Goals

- 不引入 Kubernetes、云厂商部署、镜像发布仓库或基础设施即代码。
- 不实现零停机滚动发布、蓝绿部署、自动回滚或分布式锁。
- 不把 PostgreSQL 密码和 JWT 密钥写入仓库；生产值仅通过环境变量或 Secret Manager 注入。
