# task-notifications Specification

## Purpose

定义通知 outbox 在长处理、租约续期和旧实例恢复竞争下的处理权边界。

## ADDED Requirements

### Requirement: 每次通知处理尝试必须具有租约令牌

通知处理器 MUST 在认领任务时生成新的唯一 `leaseToken`，并将其与 `processing` 状态和未来的 `leaseUntil` 一起持久化。重新认领过期任务时 MUST 生成新令牌，不能沿用旧实例令牌。

#### Scenario: 认领生成新的处理令牌

- **WHEN** 实例认领一个 `pending` 或租约已过期的 `processing` 任务
- **THEN** 任务进入 `processing` 并写入新的 `leaseToken`
- **AND** `attempts` 递增且 `leaseUntil` 晚于当前时间

### Requirement: 活跃处理必须续租

通知处理器 MUST 在处理期间按固定间隔续租。续租条件 MUST 同时匹配任务 ID、`processing` 状态、当前 `leaseToken` 和未过期的原租约；续租失败不得把任务伪装为当前实例仍持有。

#### Scenario: 长处理持续持有租约

- **WHEN** 通知生成耗时超过单次租约时长但当前实例仍在运行
- **THEN** 当前实例可以使用相同 `leaseToken` 延长 `leaseUntil`
- **AND** 其他实例不能在续租有效期间认领该任务

### Requirement: 终态更新必须受到处理权围栏保护

完成或失败更新 MUST 同时匹配当前处理令牌和未过期租约。旧实例失去租约后恢复时 MAY 产生幂等通知副作用，但 MUST NOT 将新实例的任务状态覆盖为 `completed`、`pending` 或 `failed`。

#### Scenario: 旧实例不能覆盖新实例结果

- **WHEN** 实例 A 的租约过期，实例 B 使用新令牌重新认领，实例 A 随后恢复并提交完成或失败更新
- **THEN** 实例 A 的终态更新影响行数为零
- **AND** 实例 B 的任务状态保持不变

### Requirement: 租约参数必须具有可解释的容量边界

实现 MUST 记录租约时长、续期间隔和当前通知处理耗时假设。续期间隔 MUST 小于租约时长，且当前轻量通知处理应在续期失败前有机会完成或进入可恢复状态。

#### Scenario: 续期间隔低于租约时长

- **WHEN** 维护者检查通知处理器的租约常量
- **THEN** 续期间隔小于租约时长
- **AND** 注释说明该参数不是任意处理耗时的保证，后续需以耗时分布和故障演练重新校准
