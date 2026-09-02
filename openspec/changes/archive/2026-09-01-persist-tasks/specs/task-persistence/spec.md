## ADDED Requirements

### Requirement: 将任务持久化到 PostgreSQL

系统 MUST 通过 Prisma Repository 将创建的任务保存到 PostgreSQL，而不是仅保存在应用进程内存中。

#### Scenario: 创建任务后数据库存在记录

- **WHEN** 客户端成功创建任务
- **THEN** PostgreSQL 的 Task 表中存在相同 ID、标题、状态和创建时间的记录

### Requirement: 重连后查询任务

已经保存的任务 MUST 在原应用实例关闭并建立新数据库连接后仍可查询。

#### Scenario: 新应用实例查询已有任务

- **WHEN** 第一个应用实例创建任务并关闭，第二个应用实例连接同一数据库后查询该 ID
- **THEN** 系统返回 HTTP 200 和原任务数据

### Requirement: 使用数据库迁移管理结构

数据库 Task 表结构 MUST 由版本化 Prisma migration 创建，并且迁移可在空数据库上重复应用。

#### Scenario: 空数据库执行迁移

- **WHEN** 对空 PostgreSQL 数据库执行迁移部署命令
- **THEN** 系统创建满足 Task 模型要求的表和索引，命令成功结束

### Requirement: 显式管理数据库配置

应用 MUST 从 `DATABASE_URL` 读取数据库连接配置，并在配置缺失时拒绝启动数据库模块。

#### Scenario: 缺少数据库连接配置

- **WHEN** 应用启动时没有提供 `DATABASE_URL`
- **THEN** 配置校验失败并输出可定位的错误
