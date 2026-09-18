# tenant-isolation Specification

## Purpose
定义用户、项目、任务和异步通知之间的租户边界，确保请求上下文、持久化查询和后台处理不会跨租户访问数据。
## Requirements
### Requirement: Tenant membership SHALL be explicit

系统 MUST 为每个用户维护至少一个租户成员关系，并为新注册用户创建默认租户及 owner 关系。认证用户 MUST 能创建租户并查询自己所属的租户列表。

#### Scenario: 注册用户获得默认租户

- **WHEN** 用户注册成功
- **THEN** 系统在同一事务中创建用户、默认租户和 owner 成员关系
- **AND** 登录响应保持现有用户与 access token 契约不变

#### Scenario: 用户创建并查询租户

- **WHEN** 已认证用户创建租户
- **THEN** 系统在同一事务中创建租户和该用户的 owner 成员关系
- **AND** `GET /tenants` 只返回该用户所属的租户

### Requirement: Request tenant context SHALL be resolved before business access

受保护的项目、任务和通知请求 MUST 在业务 Guard 或 Controller 执行前解析租户上下文。请求带有 `x-tenant-id` 时，系统 MUST 校验其为合法 UUID 且用户是该租户成员；用户只有一个租户且未提供请求头时可以自动使用该租户；用户属于多个租户且未提供请求头时 MUST 拒绝请求。

#### Scenario: 多租户用户未选择租户

- **WHEN** 用户属于两个或以上租户并请求项目或任务接口但未提供 `x-tenant-id`
- **THEN** 系统返回 400
- **AND** 不执行项目、任务或通知业务查询

#### Scenario: 用户选择不属于自己的租户

- **WHEN** 用户使用其他租户 ID 请求受保护业务接口
- **THEN** 系统返回 403
- **AND** 不返回目标租户的资源

### Requirement: Persistent business queries SHALL be tenant-scoped

项目创建、项目成员管理、任务创建、任务查询、任务状态更新和通知列表 MUST 使用已解析的租户 ID作为查询条件或写入归属。Repository MUST 接收租户范围，不能只根据全局资源 ID 读取或更新任务。

#### Scenario: 同 ID 资源跨租户不可访问

- **WHEN** 用户在租户 A 创建任务后，以租户 B 上下文读取或更新该任务
- **THEN** 系统返回 404 或 403 的非泄露响应
- **AND** 任务状态、版本和事件均保持不变

#### Scenario: 项目不能跨租户挂载任务

- **WHEN** 已认证用户以租户 A 上下文提交租户 B 的 `projectId` 创建任务
- **THEN** 系统返回 403
- **AND** 数据库不新增任务

### Requirement: Async notification data SHALL preserve tenant ownership

任务状态更新事务 MUST 将租户归属写入 TaskEvent 和 NotificationJob；通知处理器 MUST 使用 outbox 中的租户归属确认项目成员，并在通知载荷中保留 `tenantId`。通知查询 MUST 同时按用户和租户过滤。

#### Scenario: 后台通知不越租户

- **WHEN** 后台处理某租户的状态事件
- **THEN** 只为该租户项目成员创建通知
- **AND** 通知载荷包含该租户 ID

#### Scenario: 用户只能查询当前租户通知

- **WHEN** 用户切换 `x-tenant-id` 查询通知
- **THEN** 响应只包含所选租户的通知
- **AND** 其他租户通知不可见

### Requirement: Tenant boundaries SHALL be documented and verifiable

迁移 MUST 为历史用户和项目回填租户归属，并通过索引支持租户范围查询。关键上下文解析、Guard、Repository 和异步处理代码 MUST 具有中文注释，说明其隔离责任与故障边界。

#### Scenario: 历史数据完成租户回填

- **WHEN** 应用部署租户迁移
- **THEN** 已存在用户、项目、任务事件、通知任务和通知记录均具有非空且一致的租户归属
- **AND** 租户范围索引与外键约束创建成功
