## ADDED Requirements

### Requirement: 校验任务创建请求

系统 MUST 在请求进入 `TasksController.create` 前，使用 `CreateTaskDto` 校验任务标题，并拒绝不符合输入契约的请求。

#### Scenario: 接受有效标题

- **WHEN** 客户端提交长度为 1 到 120 个字符的字符串标题
- **THEN** 请求通过全局 ValidationPipe 并创建任务

#### Scenario: 拒绝缺失或空白标题

- **WHEN** 客户端未提交标题、提交空字符串或纯空白字符串
- **THEN** 系统返回 HTTP 400，且 Controller 不执行创建业务

#### Scenario: 拒绝非字符串标题

- **WHEN** 客户端提交数字、布尔值、数组或对象作为标题
- **THEN** 系统返回 HTTP 400

#### Scenario: 拒绝超长标题

- **WHEN** 客户端提交超过 120 个字符的标题
- **THEN** 系统返回 HTTP 400

### Requirement: 过滤请求未知字段

全局 ValidationPipe MUST 过滤 DTO 未声明的字段，并 MUST 拒绝客户端显式提交的未知字段。

#### Scenario: 请求包含未知字段

- **WHEN** 客户端提交合法标题以及 `unexpected` 字段
- **THEN** 系统返回 HTTP 400，任务不被创建

### Requirement: 返回统一校验错误

校验失败 MUST 返回 HTTP 400，并使用包含 `statusCode`、`message` 和 `error` 字段的 Nest 标准异常响应。

#### Scenario: 校验失败响应结构

- **WHEN** 任一任务创建字段校验失败
- **THEN** 响应状态码为 400，且响应 JSON 包含 `statusCode: 400`、消息数组和 `error: Bad Request`
