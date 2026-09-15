## 1. 规格与数据模型

- [x] 1.1 完成异步通知的 proposal、spec、design
- [x] 1.2 增加 `NotificationJob`、`Notification` Prisma 模型和数据库迁移

## 2. 异步处理链路

- [x] 2.1 在任务状态事务中写入通知任务
- [x] 2.2 实现通知处理器、有限重试、退避和幂等写入
- [x] 2.3 注册 `NotificationsModule` 和后台调度 Provider

## 3. HTTP 与测试

- [x] 3.1 增加认证通知查询接口
- [x] 3.2 增加 Processor 单元测试和数据库集成测试
- [x] 3.3 扩展 Fastify E2E，覆盖异步通知、隔离和未认证失败场景

## 4. 文档与验证

- [x] 4.1 更新学习路线、README 和关键代码中文注释
- [x] 4.2 运行 lint、单元测试、集成测试、E2E 测试、构建和 OpenSpec 校验
