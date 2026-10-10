# task-notifications Specification

## Purpose

定义通知 outbox 在 backlog 增长时的单实例处理批次和调度让步边界。

## ADDED Requirements

### Requirement: 通知处理必须具有单批次上限

通知处理器 MUST 限制一次本地处理循环消费的任务数量。达到批次上限后 MUST 通过异步调度继续处理后续任务，不得在同一个循环中无限 drain 可用任务。

#### Scenario: 批次达到上限后继续处理

- **WHEN** outbox 中连续存在超过单批次上限的可处理任务
- **THEN** 当前处理循环最多完成一个批次
- **AND** 处理器通过后续调度继续处理剩余任务
- **AND** 任务仍通过已有租约和处理权令牌规则认领

### Requirement: 批次让步不得引入本地重复并发

处理器 MUST 在续批期间保持实例内互斥；后续批次开始前，上一批次的处理循环必须已经释放本地处理标记。

#### Scenario: 续批不产生两个本地消费者

- **WHEN** 当前批次达到上限并安排下一批
- **THEN** 同一 Provider 不得同时运行两个 `processPending` 循环
- **AND** 关闭信号仍能在批次边界被处理

### Requirement: 固定批次必须具有容量边界说明

实现 MUST 通过中文注释和学习文档说明固定批次大小只是协作式背压起点，不是队列容量、吞吐或 SLO 承诺；后续 MUST 通过 backlog、处理耗时、数据库压力和停机延迟校准。

#### Scenario: 维护者检查批次参数

- **WHEN** 维护者查看通知处理器的批次常量和调度逻辑
- **THEN** 能看到批次上限及让步原因
- **AND** 能明确后续压测需要收集的容量证据
