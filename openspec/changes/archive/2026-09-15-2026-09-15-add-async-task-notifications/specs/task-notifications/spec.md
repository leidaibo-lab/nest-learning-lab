# task-notifications Specification

## Purpose

定义任务状态事件到异步用户通知的可靠处理边界。

## ADDED Requirements

### Requirement: 持久化异步通知任务

任务状态成功更新时，系统 MUST 在同一个数据库事务中创建对应的 `TaskEvent` 和一个待处理通知任务；事务失败时不得留下孤立的任务事件或通知任务。

#### Scenario: 状态更新创建通知任务

- **WHEN** 客户端使用当前版本成功更新任务状态
- **THEN** `Task`、`TaskEvent` 和状态为 `pending` 的通知任务在同一事务中持久化

#### Scenario: 状态更新事务失败

- **WHEN** 通知任务写入失败
- **THEN** 任务状态、版本和对应的 `TaskEvent` 都回滚

### Requirement: 异步生成项目成员通知

后台处理器 MUST 在 HTTP 状态更新请求完成后异步消费待处理通知任务，并为任务所属项目的每个成员生成任务状态通知。

#### Scenario: 项目成员收到状态通知

- **WHEN** 后台处理器成功消费任务状态事件
- **THEN** 该项目当前每个成员均有一条包含任务标识、原状态、目标状态和版本的通知

#### Scenario: 请求不等待通知处理

- **WHEN** 状态更新事务已经成功提交
- **THEN** HTTP 接口可以先返回更新后的任务，通知处理在后台继续执行

### Requirement: 异步失败重试与可追踪

通知处理失败时 MUST 将任务重新置为可重试状态并记录尝试次数和错误；达到最大尝试次数后 MUST 标记为 `failed`，不得无限重试。

#### Scenario: 失败后有限重试

- **WHEN** 生成通知时发生可恢复错误
- **THEN** 处理器记录失败原因，最多重试 3 次，重试之间使用递增延迟

#### Scenario: 超过重试上限

- **WHEN** 同一通知任务连续失败达到 3 次
- **THEN** 任务状态为 `failed`，处理器不再自动执行该任务

### Requirement: 通知处理幂等

系统 MUST 以 `taskEventId` 和 `userId` 的唯一组合约束通知；重复消费同一任务不得为同一用户创建重复通知。

#### Scenario: 重复消费同一事件

- **WHEN** 处理器因重试或重复投递再次消费已处理事件
- **THEN** 每个项目成员至多存在一条对应通知，处理最终可标记为完成

### Requirement: 查询当前用户通知

认证用户 MUST 能通过 `GET /notifications` 查询自己的任务状态通知，响应不得包含其他用户的通知。

#### Scenario: 用户查询通知

- **WHEN** 认证用户请求 `GET /notifications`
- **THEN** 系统返回该用户的通知，按创建时间倒序排列

#### Scenario: 未认证查询通知

- **WHEN** 客户端未携带有效 Bearer Token 请求 `GET /notifications`
- **THEN** 系统返回 HTTP 401
