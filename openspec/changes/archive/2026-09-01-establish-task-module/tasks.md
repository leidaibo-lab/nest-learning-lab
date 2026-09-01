## 1. 建立任务领域与 Repository 边界

- [x] 1.1 定义任务模型、创建输入、Repository 接口和自定义 Provider Token
- [x] 1.2 实现基于 Map 的异步内存 Repository

## 2. 建立 NestJS 功能模块与 HTTP 链路

- [x] 2.1 实现任务创建、最小标题校验和按 ID 查询的 Service
- [x] 2.2 实现 Controller 与 TasksModule，并由 AppModule 导入
- [x] 2.3 移除未承载业务行为的 test-demo 示例

## 3. 覆盖规格场景

- [x] 3.1 为 TasksService 增加创建、非法标题、查询和不存在场景的单元测试
- [x] 3.2 为 POST /tasks 与 GET /tasks/:id 增加 Fastify E2E 测试

## 4. 文档与验证

- [x] 4.1 在 AGENTS.md 中规定提交 message 使用中文，并同步相关示例
- [x] 4.2 运行 OpenSpec 校验、lint、单元测试、E2E 测试和构建
- [x] 4.3 通过 git diff 检索并记录第一阶段关键变更
