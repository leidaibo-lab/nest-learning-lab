## 1. 状态模型与数据库迁移

- [x] 1.1 扩展 Task 状态和版本字段，新增 TaskEvent 模型
- [x] 1.2 创建 Prisma migration 并部署到本地 PostgreSQL

## 2. Repository 与业务链路

- [x] 2.1 扩展 TaskRepository 和内存实现的状态更新接口
- [x] 2.2 实现 Prisma 事务更新、乐观锁和 TaskEvent 写入
- [x] 2.3 增加状态 DTO、Service 状态转换和 Controller 路由

## 3. 测试并发与一致性

- [x] 3.1 增加状态 DTO/Service 单元测试
- [x] 3.2 增加 Prisma Repository 事务、版本冲突和事件集成测试
- [x] 3.3 增加状态更新、并发冲突和跨实例 E2E 测试

## 4. 验证与沉淀

- [x] 4.1 更新 Prisma 项目能力文档和学习路线
- [x] 4.2 运行生成、迁移、lint、单元、集成、E2E、构建和 OpenSpec 校验
- [x] 4.3 通过 git diff 检索关键变更并归档，不创建 Git 提交
