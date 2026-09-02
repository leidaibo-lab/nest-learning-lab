## 1. 数据库基础设施

- [x] 1.1 增加 PostgreSQL Compose、环境变量示例和配置校验
- [x] 1.2 增加 Prisma schema、初始 migration 和 package scripts
- [x] 1.3 实现 DatabaseModule 与 PrismaService 生命周期

## 2. Repository Provider 替换

- [x] 2.1 实现 PrismaTaskRepository 及 DateTime 映射
- [x] 2.2 将 TasksModule 的 TASK_REPOSITORY 绑定为 PrismaTaskRepository
- [x] 2.3 保持 Service 单元测试使用内存 Repository

## 3. 数据库测试

- [x] 3.1 增加 PrismaTaskRepository 集成测试与数据库清理
- [x] 3.2 调整 E2E 测试使用真实数据库并覆盖跨应用实例查询

## 4. 验证与沉淀

- [x] 4.1 执行迁移、生成 Client、lint、单元测试、集成测试、E2E 和构建
- [x] 4.2 通过 git diff 检索关键变更并更新实施回顾
- [x] 4.3 归档 OpenSpec 变更但不创建 Git 提交
