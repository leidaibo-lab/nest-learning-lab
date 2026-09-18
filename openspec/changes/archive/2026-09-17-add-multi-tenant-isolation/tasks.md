# 实施任务

- [x] 更新 Prisma schema 和迁移，新增租户模型、历史数据回填、租户归属字段、复合约束和索引。
- [x] 实现租户模块、租户创建/列表接口、请求上下文 Guard、当前租户装饰器，并补充中文边界注释。
- [x] 修改注册流程，在同一事务中创建默认租户和 owner 成员；让项目创建与成员管理使用租户上下文。
- [x] 修改任务 Repository、Service 和 Controller，强制所有任务读写携带 tenantId，并补充单元测试。
- [x] 修改异步事件、outbox、通知处理器和通知查询，验证租户归属在后台链路中不丢失。
- [x] 增加跨租户 E2E、Repository 集成测试和上下文 Guard 单元测试。
- [x] 更新学习路线和变更 README，运行 lint、单元测试、集成测试、E2E、构建、OpenSpec validate 与 git diff 校验。
