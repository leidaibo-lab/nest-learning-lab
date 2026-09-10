## MODIFIED Requirements

### Requirement: 创建任务

系统 MUST 接受认证项目成员提交的非空任务标题和项目标识，创建具有唯一标识、项目归属、标准化标题、初始 `todo` 状态、版本号 1 和创建时间的任务，并通过 `POST /tasks` 返回该任务。

#### Scenario: 项目成员创建任务

- **WHEN** 项目成员向 `POST /tasks` 提交非空标题和所属项目的 `projectId`
- **THEN** 系统返回 HTTP 201，响应包含 `projectId`、生成的 `id`、去除首尾空白的 `title`、值为 `todo` 的 `status`、值为 1 的 `version` 和 `createdAt`

#### Scenario: 非成员不能创建任务

- **WHEN** 认证用户向 `POST /tasks` 提交不属于其项目成员关系的 `projectId`
- **THEN** 系统返回 HTTP 403，且不保存任务

#### Scenario: 未认证不能创建任务

- **WHEN** 客户端不携带有效 Bearer Token 向 `POST /tasks` 提交任务
- **THEN** 系统返回 HTTP 401，且不保存任务

### Requirement: 按标识查询任务

系统 MUST 支持项目成员通过任务标识查询已经创建的任务，并返回当前版本号；非成员不得通过任务标识探测任务是否存在。

#### Scenario: 项目成员查询已存在任务

- **WHEN** 项目成员向 `GET /tasks/:id` 提交所属项目的任务标识
- **THEN** 系统返回 HTTP 200 和包含当前 `version` 与 `projectId` 的完整任务数据

#### Scenario: 非成员查询任务

- **WHEN** 非项目成员向 `GET /tasks/:id` 提交已存在任务的标识
- **THEN** 系统返回 HTTP 403

### Requirement: Repository 依赖边界

任务服务 MUST 通过自定义 Provider Token 使用 Repository 抽象，而不直接依赖具体存储实现；生产应用中的 Token MUST 解析为 PostgreSQL Prisma Repository，单元测试 MAY 使用测试替身替换该 Provider。

#### Scenario: 生产模块注入 Prisma Repository

- **WHEN** NestJS 创建生产应用的 `TasksModule` 依赖图
- **THEN** `TASK_REPOSITORY` Token 解析为 Prisma Repository，任务服务通过同一抽象完成保存、查询和状态更新

#### Scenario: 单元测试注入测试替身

- **WHEN** TasksService 单元测试创建独立 TestingModule
- **THEN** 测试可将 `TASK_REPOSITORY` Token 绑定为 mock 或 fake Repository 而无需启动数据库
