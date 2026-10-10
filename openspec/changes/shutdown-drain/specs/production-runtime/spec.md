# production-runtime Specification

## MODIFIED Requirements

### Requirement: 关闭信号必须先触发流量摘除再排空后台任务

应用收到 `SIGTERM` 等关闭信号后 MUST 在模块销毁前进入 draining 状态；就绪探针 MUST 停止报告可接流量，通知处理器 MUST 停止新任务认领并等待当前数据库操作结束，随后 Prisma 才能断开连接。

#### Scenario: SIGTERM 触发有序停机

- **WHEN** 应用进程收到 `SIGTERM`
- **THEN** 应用生命周期状态进入 draining
- **AND** `/health/ready` 返回 HTTP 503
- **AND** 通知处理器不再认领新任务
- **AND** 已开始的任务处理完成或按租约恢复规则退出
- **AND** Prisma 在活动任务结束后断开连接

#### Scenario: 强制终止后的任务恢复

- **WHEN** 进程在 draining 期间被强制终止且当前通知任务未完成
- **THEN** 任务保持已有的 processing 状态和租约边界
- **AND** 后续实例可在租约过期后重新认领任务
