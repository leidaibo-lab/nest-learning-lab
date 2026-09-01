# NestJS 系统学习路线

## 1. 学习目标

本仓库不是孤立 API 示例的集合，而是一个通过真实业务增量理解 NestJS 的学习实验室。主线场景为任务管理系统：用户在项目中创建、分配和流转任务，并通过评论、通知和审计记录协作过程。

学习过程同时关注三个层面：

- 框架机制：模块系统、依赖注入、请求生命周期及平台适配。
- 应用设计：业务边界、数据一致性、权限、安全和可观测性。
- 工程质量：规格、测试、提交粒度、持续集成和部署。

## 2. 当前基线

基线提交：`45d1598 chore(project): initialize Nest learning lab`

当前已经具备：

- NestJS 11、TypeScript 严格模式和 Fastify 适配器。
- 根模块、Controller、Service 及构造器依赖注入示例。
- Jest 单元测试和基于 Fastify `app.inject()` 的端到端测试骨架。
- 空的 `test-demo` Controller 和尚未接入请求链路的 DTO。

当前尚未覆盖：业务模块边界、输入校验、持久化、认证授权、横切能力、异步流程和生产部署。

## 3. 主线业务模型

```text
用户
 └── 项目
      └── 任务
           ├── 状态流转
           ├── 负责人
           ├── 评论
           └── 操作事件
```

选择任务管理作为主线，是因为同一模型可以自然承载 CRUD、事务、权限、事件、队列和实时通信，不需要在每个学习阶段更换业务上下文。

## 4. 分阶段路线

| 阶段 | NestJS 重点 | 业务增量 | 完成标准 |
| --- | --- | --- | --- |
| 1. 模块与依赖注入 | Module、Controller、Provider、自定义 Token | 创建与查询任务，先使用内存存储 | 模块边界清晰；业务规则有单元测试；HTTP 契约有 E2E 测试 |
| 2. HTTP 请求生命周期 | DTO、Pipe、Filter、Interceptor、Middleware | 参数校验、分页、统一错误和响应格式 | 能说明完整请求链路；非法输入和异常路径有测试 |
| 3. 数据持久化 | 动态模块、配置注入、Repository 边界 | PostgreSQL、迁移、事务和并发更新 | 数据可迁移；事务边界明确；测试不依赖执行顺序 |
| 4. 认证与授权 | Guard、Decorator、Passport/JWT | 登录、项目成员和任务操作权限 | 认证与授权分离；越权场景被 E2E 测试覆盖 |
| 5. 工程横切能力 | Config、Logger、Exception Filter、Health Check | 请求追踪、审计日志、限流和接口文档 | 关键请求可观测；配置可校验；服务可探活 |
| 6. 异步与实时场景 | Event、BullMQ、Cache、WebSocket | 通知、后台任务、缓存和实时状态更新 | 重试与幂等策略明确；异步失败可追踪 |
| 7. 生产化 | Testing、Lifecycle、Deployment | Docker、CI、优雅停机和部署 | 构建与测试自动化；部署、回滚和运行手册齐全 |

微服务不作为前置目标。只有当模块边界、异步事件和独立扩缩容需求已经通过单体实现得到验证后，再评估拆分。

## 5. 每个增量的固定闭环

每个学习增量都遵循同一流程：

1. 在 `openspec/changes/<change-name>/` 创建提案，写清动机、能力和影响。
2. 用可测试的 Requirement/Scenario 定义行为，再记录必要的技术设计与任务。
3. 每次只实现一条完整纵向链路：路由、校验、业务规则、存储和测试。
4. 运行 lint、单元测试、E2E 测试和构建，并更新 OpenSpec 任务状态。
5. 通过 `git diff --stat`、`git diff` 和 `git show --stat` 回顾关键变更。
6. 完成后归档变更，将已经稳定的行为合并到 `openspec/specs/`。

## 6. 测试策略

- 单元测试：覆盖 Service、领域规则和失败分支，不启动完整应用。
- 集成测试：覆盖数据库 Repository、事务和外部适配器边界。
- E2E 测试：通过 Fastify `app.inject()` 覆盖 HTTP 状态码、响应体、校验和权限。
- 每个 OpenSpec Scenario 至少对应一个可定位的测试，或在设计中说明无法自动化的原因。

## 7. 提交规范

提交遵循 `type(scope): message`，一个提交表达一个可独立理解的变更。常用类型包括 `feat`、`fix`、`test`、`docs`、`refactor`、`chore`。

示例：

```text
feat(tasks): add task creation endpoint
feat(validation): validate task creation payload
test(tasks): cover task creation workflow
docs(learning): document request lifecycle
```

## 8. 近期迭代

### 迭代一：建立任务模块

- 将 `test-demo` 替换为独立的 `TasksModule`。
- 建立 Controller、Service、Repository 接口和内存实现。
- 实现创建任务与按 ID 查询任务。
- 补齐 Service 单元测试和 Fastify E2E 测试。

建议 OpenSpec 变更名：`establish-task-module`。

### 迭代二：输入校验与错误契约

- 引入 DTO 校验和全局 `ValidationPipe`。
- 定义任务不存在、参数非法等错误响应。
- 观察 Pipe、Controller、Service 和 Filter 的调用顺序。

建议 OpenSpec 变更名：`add-task-validation`。

### 迭代三：持久化任务

- 接入 PostgreSQL，并通过 Repository 隔离基础设施实现。
- 增加迁移、集成测试和事务场景。
- 保持 Controller 和核心业务规则不依赖具体 ORM。

建议 OpenSpec 变更名：`persist-tasks`。
