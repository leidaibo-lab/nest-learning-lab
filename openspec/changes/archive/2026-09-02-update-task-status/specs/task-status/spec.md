## ADDED Requirements

### Requirement: 更新任务状态

系统 MUST 通过 `PATCH /tasks/:id/status` 接受目标状态和期望版本，并在状态转换合法且版本匹配时更新任务。

#### Scenario: 从 todo 更新为 in_progress

- **WHEN** 客户端提交 `status: in_progress` 和当前 `expectedVersion`
- **THEN** 系统返回 HTTP 200，任务状态变为 `in_progress`，版本号增加 1

#### Scenario: 从 in_progress 更新为 done

- **WHEN** 客户端提交 `status: done` 和当前 `expectedVersion`
- **THEN** 系统返回 HTTP 200，任务状态变为 `done`，版本号增加 1

#### Scenario: 拒绝非法状态转换

- **WHEN** 客户端尝试从 `done` 回退，或提交未定义的状态
- **THEN** 系统返回 HTTP 400，任务状态和版本保持不变

### Requirement: 乐观并发控制

系统 MUST 使用 `expectedVersion` 作为条件更新依据，拒绝使用过期版本覆盖较新任务。

#### Scenario: 版本不匹配

- **WHEN** 客户端提交的 `expectedVersion` 小于数据库当前版本
- **THEN** 系统返回 HTTP 409，任务状态不改变

#### Scenario: 并发请求只有一个成功

- **WHEN** 两个请求同时使用相同的 `expectedVersion` 更新同一任务
- **THEN** 恰好一个请求返回 HTTP 200，另一个返回 HTTP 409

### Requirement: 状态变更与事件原子提交

成功的状态更新 MUST 在同一数据库事务中更新 Task 并创建 TaskEvent；任一操作失败时两者都 MUST 回滚。

#### Scenario: 成功更新产生事件

- **WHEN** 状态更新成功提交
- **THEN** TaskEvent 记录任务 ID、原状态、目标状态和使用的版本

#### Scenario: 事务失败不留下部分写入

- **WHEN** 任务更新或事件写入在事务中失败
- **THEN** Task 和 TaskEvent 都不保留本次变更

### Requirement: 状态更新错误契约

状态更新接口 MUST 对不存在任务、无效请求和版本冲突返回可区分的 HTTP 状态码。

#### Scenario: 任务不存在

- **WHEN** 客户端使用不存在的任务 ID 更新状态
- **THEN** 系统返回 HTTP 404

#### Scenario: 请求体非法

- **WHEN** 客户端缺少 `status` 或 `expectedVersion`，或提交非法类型
- **THEN** 系统返回 HTTP 400
