# 实施任务

- [x] 为 NotificationProcessor 增加单批次上限和 `setImmediate` 续批。
- [x] 添加中文注释，说明协作式背压、事件循环让步和容量假设。
- [x] 增加 Processor 单元测试，覆盖批次上限、续批和本地互斥。
- [x] 更新学习路线，记录 backlog、处理延迟、数据库压力和停机延迟的压测边界。
- [x] 运行 lint、单元测试、构建、OpenSpec validate 与 git diff 校验。
- [ ] 在 Docker PostgreSQL 可用后运行集成测试和 E2E，补齐数据库边界验证。
