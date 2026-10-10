# 实施任务

- [x] 更新 Prisma schema 和迁移，增加通知处理尝试令牌及中文边界注释。
- [x] 修改 NotificationProcessor，实现定时续租、主动续租和令牌围栏的完成/失败更新。
- [x] 增加 Processor 单元测试，覆盖令牌写入、续租条件、租约失效和终态保护。
- [x] 增加 PostgreSQL 集成测试，验证令牌字段迁移和旧实例不能覆盖新实例结果。
- [x] 更新学习路线，记录本阶段的处理耗时假设、故障模型和下一步压测边界。
- [ ] 运行 lint、单元测试、集成测试、E2E、构建、OpenSpec validate 与 git diff 校验。
