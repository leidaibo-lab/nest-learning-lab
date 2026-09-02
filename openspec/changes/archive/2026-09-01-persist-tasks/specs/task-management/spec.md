## MODIFIED Requirements

### Requirement: Repository 依赖边界

任务服务 MUST 通过自定义 Provider Token 使用 Repository 抽象，而不直接依赖具体存储实现；生产应用中的 Token MUST 解析为 PostgreSQL Prisma Repository，单元测试 MAY 使用内存实现替换该 Provider。

#### Scenario: 生产模块注入 Prisma Repository

- **WHEN** NestJS 创建生产应用的 `TasksModule` 依赖图
- **THEN** `TASK_REPOSITORY` Token 解析为 Prisma Repository，任务服务通过同一抽象完成保存与查询

#### Scenario: 单元测试注入内存 Repository

- **WHEN** TasksService 单元测试创建独立 TestingModule
- **THEN** 测试可将 `TASK_REPOSITORY` Token 绑定为内存实现而无需启动数据库
