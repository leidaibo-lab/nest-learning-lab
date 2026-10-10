# task-notifications Specification

## Purpose

定义通知 outbox 在多实例消费和实例故障后的租约恢复边界。

## ADDED Requirements

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
