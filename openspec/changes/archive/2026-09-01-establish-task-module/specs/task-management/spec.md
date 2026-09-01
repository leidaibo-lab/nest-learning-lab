## ADDED Requirements

### Requirement: 创建任务

系统 MUST 接受非空任务标题，创建具有唯一标识、标准化标题、初始状态和创建时间的任务，并通过 `POST /tasks` 返回该任务。

#### Scenario: 使用有效标题创建任务

- **WHEN** 客户端向 `POST /tasks` 提交非空标题
- **THEN** 系统返回 HTTP 201，响应包含生成的 `id`、去除首尾空白的 `title`、值为 `todo` 的 `status` 和 `createdAt`

#### Scenario: 使用空标题创建任务

- **WHEN** 客户端向 `POST /tasks` 提交空字符串、纯空白字符串或缺少标题
- **THEN** 系统返回 HTTP 400，且不保存任务

### Requirement: 按标识查询任务

系统 MUST 支持通过任务标识查询已经创建的任务。

#### Scenario: 查询已存在任务

- **WHEN** 客户端向 `GET /tasks/:id` 提交已存在的任务标识
- **THEN** 系统返回 HTTP 200 和对应任务的完整数据

#### Scenario: 查询不存在任务

- **WHEN** 客户端向 `GET /tasks/:id` 提交不存在的任务标识
- **THEN** 系统返回 HTTP 404

### Requirement: Repository 依赖边界

任务服务 MUST 通过自定义 Provider Token 使用 Repository 抽象，而不直接依赖内存存储实现。

#### Scenario: 注入内存 Repository

- **WHEN** NestJS 创建 `TasksModule` 的依赖图
- **THEN** `TASK_REPOSITORY` Token 解析为模块注册的内存 Repository，任务服务可以通过抽象完成保存与查询
