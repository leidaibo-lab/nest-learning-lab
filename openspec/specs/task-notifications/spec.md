# task-notifications Specification

## Purpose
定义任务状态事件到异步用户通知的可靠处理边界，包括持久化 outbox、后台消费、有限重试、幂等写入和按用户隔离查询。
## Requirements
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

### Requirement: 通知任务必须支持租约恢复

通知处理器 MUST 在将任务置为 `processing` 时写入未来的租约过期时间。处理器查询任务时 MUST 同时选择已到期的 `pending` 任务和 `leaseUntil` 已过期的 `processing` 任务；只有带有相同状态及到期条件的条件更新成功时，实例才获得处理权。

#### Scenario: 正常任务获得租约

- **WHEN** 两个应用实例同时竞争一个已到期的 `pending` 通知任务
- **THEN** 至多一个实例能将任务条件更新为 `processing`
- **AND** 成功实例写入未来的 `leaseUntil` 并递增尝试次数

#### Scenario: 处理实例异常退出后被回收

- **WHEN** 任务为 `processing` 且 `leaseUntil` 早于当前时间
- **THEN** 后续实例可以重新认领该任务
- **AND** 任务不会永久停留在 `processing`

#### Scenario: 活跃租约不会被抢占

- **WHEN** 任务为 `processing` 且 `leaseUntil` 晚于当前时间
- **THEN** 其他实例不得认领该任务
- **AND** 不增加任务尝试次数

### Requirement: 租约恢复必须保留幂等边界

租约过期重新处理 MAY 与上一次实例产生并发或重复副作用；系统 MUST 继续使用 `(userId, taskEventId)` 唯一约束和幂等写入保护通知，不得把租约恢复描述为恰好一次处理。

#### Scenario: 过期任务重复处理

- **WHEN** 原实例已写入部分通知后失去租约，后续实例重新处理同一事件
- **THEN** 每个项目成员至多存在一条该事件通知
- **AND** 任务最终可以进入 `completed` 或按已有有限重试规则进入 `failed`

### Requirement: 结束状态必须释放租约

通知任务成功完成或达到重试上限时 MUST 将 `leaseUntil` 清空；关闭处理器时不得主动把仍在执行的任务伪装成已完成，任务可在租约过期后由其他实例恢复。

#### Scenario: 成功和失败清理租约

- **WHEN** 通知任务完成或达到最大尝试次数
- **THEN** 任务状态分别为 `completed` 或 `failed`
- **AND** `leaseUntil` 为空
