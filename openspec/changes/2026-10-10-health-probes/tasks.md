# 实施任务

- [x] 扩展 HealthService，区分进程存活检查和数据库就绪检查。
- [x] 新增 `/health/live` 与 `/health/ready` 路由，并保留 `/health` 兼容行为。
- [x] 调整 Prisma 连接生命周期，确保数据库故障时进程仍可启动并响应存活探针。
- [x] 添加中文注释，说明探针职责、故障模型和后续运维边界。
- [x] 增加 HealthService 单元测试与 Fastify E2E/OpenAPI 契约测试。
- [x] 运行 lint、单元测试、构建、OpenSpec validate 与 git diff 校验。
- [ ] 在 Docker PostgreSQL 可用后运行集成测试和 E2E，验证数据库可用与不可用边界。
