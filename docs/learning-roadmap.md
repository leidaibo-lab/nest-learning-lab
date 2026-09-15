# NestJS 系统学习路线

## 1. 学习目标

本仓库不是孤立 API 示例的集合，而是一个通过真实业务增量理解 NestJS 的学习实验室。主线场景为任务管理系统：用户在项目中创建、分配和流转任务，并通过评论、通知和审计记录协作过程。

学习过程同时关注三个层面：

- 框架机制：模块系统、依赖注入、请求生命周期及平台适配。
- 应用设计：业务边界、数据一致性、权限、安全和可观测性。
- 工程质量：规格、测试、提交粒度、持续集成和部署。

## 2. 起始基线与当前进度

基线提交：`45d1598 chore(project): initialize Nest learning lab`

起始基线已经具备：

- NestJS 11、TypeScript 严格模式和 Fastify 适配器。
- 根模块、Controller、Service 及构造器依赖注入示例。
- Jest 单元测试和基于 Fastify `app.inject()` 的端到端测试骨架。
- 空的 `test-demo` Controller 和尚未接入请求链路的 DTO。

第一阶段现已完成，并归档为 `openspec/changes/archive/2026-09-01-establish-task-module/`：

- `TasksModule` 已形成独立业务边界，并由 `AppModule` 导入。
- 任务服务通过自定义 Token 使用 Repository 抽象，生产环境绑定 Prisma 实现，单元测试使用 mock 或 fake Repository。
- `POST /tasks` 与 `GET /tasks/:id` 已形成可运行的创建、查询链路。
- Service 单元测试与 Fastify E2E 测试已覆盖成功和关键失败场景。

第二阶段现已完成，并归档为 `openspec/changes/archive/2026-09-01-add-task-validation/`：

- `CreateTaskDto` 已具备运行时类型、非空和长度校验。
- 全局 `ValidationPipe` 已启用转换、白名单和未知字段拒绝。
- 非法请求会在进入 Controller 前返回标准 HTTP 400 响应。

第三阶段现已完成，并归档为 `openspec/changes/archive/2026-09-01-persist-tasks/`：

- PostgreSQL 17 与 Prisma 6 已提供版本化持久化和初始 migration。
- ConfigModule 与 DatabaseModule 已集中管理连接配置和 Prisma 生命周期。
- 生产 Repository Provider 已切换为 Prisma 实现，Controller、Service 和 Repository 接口保持不变。
- 数据库集成测试和跨应用实例 E2E 已验证任务不会随进程关闭而丢失。

第四阶段现已完成，并归档为 `openspec/changes/archive/2026-09-02-update-task-status/`：

- 任务状态支持 `todo`、`in_progress` 和 `done`，并通过 `version` 实现乐观并发控制。
- `PATCH /tasks/:id/status` 在进入数据库前校验状态转换和请求版本。
- Prisma Repository 使用 `$transaction` 同时更新 Task 和写入 TaskEvent。
- 并发请求使用相同版本时只有一个成功，事件写入失败会回滚任务状态。
- 当前尚未覆盖：认证授权、横切能力、异步流程和生产部署。下一步进入认证与授权。

第五阶段现已完成，并归档为 `openspec/changes/archive/2026-09-09-add-auth-and-authorization/`：

- 新增用户注册、登录和基于 HS256 的 JWT Bearer Token 认证，使用 `@nestjs/jwt` 负责 JWT，使用 `argon2id` 保存密码哈希。
- `JwtAuthGuard` 负责确认用户身份，`ProjectAccessGuard` 负责确认项目成员关系，`@CurrentUser()` 和 `@Roles()` 展示请求上下文与角色元数据的使用。
- 新增项目和项目成员模型，项目创建与 owner 成员写入在同一个 Prisma 事务中完成。
- 任务必须属于项目；任务创建、查询和状态更新均要求项目成员，项目成员管理仅允许 owner。
- 认证实现按成熟库方案收敛：Access Token 有效期 15 分钟，校验 issuer/audience，旧 `scrypt` 哈希在成功登录后自动升级为 Argon2id。
- 当前尚未覆盖：刷新 Token、密码找回、OAuth、横切能力、异步流程和生产部署。

第六阶段本次增量已完成，并归档为 `2026-09-10-add-request-observability-and-health`：

- 全局拦截器为请求生成或透传 `x-request-id`，记录结构化 HTTP 日志。
- 全局异常过滤器统一补充 `requestId`，并隐藏未知异常的内部细节。
- 新增不要求认证的 `GET /health`，通过 Prisma 轻量查询检查数据库可用性。
- 当前尚未覆盖：限流、OpenAPI、分布式追踪、缓存和实时通信。

第七阶段本次增量已完成，并归档为 `2026-09-15-2026-09-15-add-async-task-notifications`：

- 使用 PostgreSQL outbox 在任务状态事务中可靠记录异步通知任务。
- 使用 NestJS 后台 Provider 消费任务，学习有限重试、退避和幂等处理。
- 新增认证后的 `GET /notifications` 查询当前用户的任务状态通知。
- 本次暂不覆盖 Redis/BullMQ、WebSocket、缓存和外部推送渠道。

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

| 阶段                 | NestJS 重点                                    | 业务增量                           | 完成标准                                               |
| -------------------- | ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| 1. 模块与依赖注入    | Module、Controller、Provider、自定义 Token     | 创建与查询任务，先使用内存存储     | 模块边界清晰；业务规则有单元测试；HTTP 契约有 E2E 测试 |
| 2. HTTP 请求生命周期 | DTO、Pipe、Filter、Interceptor、Middleware     | 参数校验、分页、统一错误和响应格式 | 能说明完整请求链路；非法输入和异常路径有测试           |
| 3. 数据持久化        | 动态模块、配置注入、Repository 边界            | PostgreSQL、迁移、事务和并发更新   | 数据可迁移；事务边界明确；测试不依赖执行顺序           |
| 4. 认证与授权        | Guard、Decorator、Passport/JWT                 | 登录、项目成员和任务操作权限       | 认证与授权分离；越权场景被 E2E 测试覆盖                |
| 5. 工程横切能力      | Config、Logger、Exception Filter、Health Check | 请求追踪、审计日志、限流和接口文档 | 关键请求可观测；配置可校验；服务可探活                 |
| 6. 异步与实时场景    | Event、BullMQ、Cache、WebSocket                | 通知、后台任务、缓存和实时状态更新 | 重试与幂等策略明确；异步失败可追踪                     |
| 7. 生产化            | Testing、Lifecycle、Deployment                 | Docker、CI、优雅停机和部署         | 构建与测试自动化；部署、回滚和运行手册齐全             |

微服务不作为前置目标。只有当模块边界、异步事件和独立扩缩容需求已经通过单体实现得到验证后，再评估拆分。

## 5. 业务并发控制专题

并发控制作为跨阶段专题，穿插在持久化、异步和生产化学习过程中。专题不绑定某一个 NestJS 模块，而是通过业务案例理解“谁可能同时修改同一份状态、冲突在哪里发生、由哪一层保证一致性”。

### 学习顺序

1. 单进程并发：异步任务、事件循环和竞态条件。
2. 数据库并发：事务、行锁、条件更新、乐观锁和唯一约束。
3. 任务消费并发：任务抢占、状态机、重试、幂等和租约恢复。
4. 典型业务场景：库存扣减、余额变更、重复提交和任务状态流转。
5. 分布式并发：消息队列、分布式锁和最终一致性。
6. 并发测试：并发请求、压力测试、故障注入和一致性验证。

### 当前案例

异步任务通知阶段使用 PostgreSQL 条件更新抢占 `pending` 任务，再通过 `(userId, taskEventId)` 唯一约束保证重复消费幂等。该案例覆盖“至少一次处理”模型；后续专题将补充 `processing` 任务的租约超时恢复，并与任务状态更新中的 `version` 乐观锁进行对比。

### 完成标准

- 能区分应用内并发、数据库并发和跨服务并发的边界。
- 能根据业务冲突类型选择条件更新、事务、锁、唯一约束或消息队列。
- 能说明至少一次、至多一次和恰好一次处理的实际差异。
- 能通过并发测试和故障注入证明数据不会被重复处理或错误覆盖。

## 6. 每个增量的固定闭环

每个学习增量都遵循同一流程：

1. 在 `openspec/changes/<change-name>/` 创建提案，写清动机、能力和影响。
2. 用可测试的 Requirement/Scenario 定义行为，再记录必要的技术设计与任务。
3. 每次只实现一条完整纵向链路：路由、校验、业务规则、存储和测试。
4. 运行 lint、单元测试、E2E 测试和构建，并更新 OpenSpec 任务状态。
5. 通过 `git diff --stat`、`git diff` 和 `git show --stat` 回顾关键变更。
6. 完成后归档变更，将已经稳定的行为合并到 `openspec/specs/`。

## 7. 测试策略

- 单元测试：覆盖 Service、领域规则和失败分支，不启动完整应用。
- 集成测试：覆盖数据库 Repository、事务和外部适配器边界。
- E2E 测试：通过 Fastify `app.inject()` 覆盖 HTTP 状态码、响应体、校验和权限。
- 每个 OpenSpec Scenario 至少对应一个可定位的测试，或在设计中说明无法自动化的原因。

## 8. 提交规范

提交遵循 `type(scope): message`，一个提交表达一个可独立理解的变更。常用类型包括 `feat`、`fix`、`test`、`docs`、`refactor`、`chore`。

示例：

```text
feat(tasks): 新增任务创建接口
feat(validation): 校验任务创建参数
test(tasks): 覆盖任务创建流程
docs(learning): 记录请求生命周期
```

## 9. 近期迭代

### 迭代一：建立任务模块

状态：已完成，归档变更为 `2026-09-01-establish-task-module`。

- 将 `test-demo` 替换为独立的 `TasksModule`。
- 建立 Controller、Service、Repository 接口和内存实现。
- 实现创建任务与按 ID 查询任务。
- 补齐 Service 单元测试和 Fastify E2E 测试。

建议 OpenSpec 变更名：`establish-task-module`。

### 迭代二：输入校验与错误契约

状态：已完成，归档变更为 `2026-09-01-add-task-validation`。

- 引入 DTO 校验和全局 `ValidationPipe`。
- 定义任务不存在、参数非法等错误响应。
- 观察 Pipe、Controller、Service 和 Filter 的调用顺序。

建议 OpenSpec 变更名：`add-task-validation`。

### 迭代三：持久化任务

状态：已完成，归档变更为 `2026-09-01-persist-tasks`。

- 接入 PostgreSQL，并通过 Repository 隔离基础设施实现。
- 增加迁移、集成测试和事务场景。
- 保持 Controller 和核心业务规则不依赖具体 ORM。

建议 OpenSpec 变更名：`persist-tasks`。

### 迭代四：状态更新与事务

状态：已完成，归档变更为 `2026-09-02-update-task-status`。

- 增加任务状态流转和版本号。
- 使用 Repository 条件更新处理并发冲突。
- 使用 Prisma `$transaction` 保证任务和操作事件原子提交。

### 迭代五：认证与授权

状态：已完成，归档变更为 `2026-09-09-add-auth-and-authorization`。

- 增加用户注册、登录和 JWT 认证 Guard。
- 增加项目 owner/member 关系和项目访问授权 Guard。
- 将任务绑定到项目，覆盖成员访问与越权失败场景。
- 使用 `@nestjs/jwt` 和 `argon2id` 替换手写 JWT 与 Node `scrypt` 主路径，保留旧哈希兼容迁移。

### 迭代六：请求可观测性与健康检查

状态：已完成，归档变更为 `2026-09-10-add-request-observability-and-health`。

- 使用全局 Interceptor 生成请求 ID 并记录 HTTP 耗时和状态码。
- 使用全局 Exception Filter 保持业务错误契约并关联请求 ID。
- 使用独立 HealthModule 检查 PostgreSQL 连通性，提供容器和负载均衡器探针。

### 迭代七：异步任务通知

状态：已完成，归档变更为 `2026-09-15-2026-09-15-add-async-task-notifications`。

- 在状态更新事务中写入通知 outbox，避免提交后进程崩溃造成异步工作丢失。
- 使用后台 Processor 生成项目成员通知，失败时有限重试并保留错误原因。
- 使用 `(userId, taskEventId)` 唯一约束保证重复消费不会重复通知。
