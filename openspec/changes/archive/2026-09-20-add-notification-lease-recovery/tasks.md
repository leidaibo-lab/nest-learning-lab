# 实施任务

- [x] 更新 Prisma schema 和迁移，增加通知任务租约字段、索引和中文迁移注释。
- [x] 修改 NotificationProcessor 的认领、完成和失败路径，实现过期租约回收并补充边界注释。
- [x] 增加 Processor 单元测试，覆盖同时竞争、过期租约、活跃租约和结束状态清理。
- [x] 增加 PostgreSQL 集成测试，验证实例异常留下的 `processing` 任务可以被后续处理器恢复且通知幂等。
- [x] 更新学习路线和稳定规格，记录本阶段的故障模型、容量假设、验证证据和下一步边界。
- [x] 运行 lint、单元测试、集成测试、E2E、构建、OpenSpec validate 与 git diff 校验。
