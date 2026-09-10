# project-membership Specification

## Purpose
TBD - created by archiving change add-auth-and-authorization. Update Purpose after archive.
## Requirements
### Requirement: 创建项目

认证用户 MUST 能创建非空项目名称的项目，创建者 MUST 自动成为该项目的 owner 成员。

#### Scenario: 创建项目并成为所有者

- **WHEN** 认证用户向 `POST /projects` 提交合法项目名称
- **THEN** 系统返回 HTTP 201 和项目 ID，当前用户对该项目具有 owner 角色

#### Scenario: 拒绝空项目名称

- **WHEN** 认证用户提交缺少、空白或超长项目名称
- **THEN** 系统返回 HTTP 400，且不创建项目

### Requirement: 管理项目成员

只有项目 owner MUST 能将已注册用户加入项目并授予 `member` 角色；非 owner、未知用户和重复成员 MUST 被拒绝。

#### Scenario: 所有者邀请已注册用户

- **WHEN** 项目 owner 向 `POST /projects/:id/members` 提交已注册用户邮箱
- **THEN** 系统返回 HTTP 201，目标用户成为该项目的 member

#### Scenario: 非所有者不能邀请成员

- **WHEN** 普通项目成员尝试邀请用户加入项目
- **THEN** 系统返回 HTTP 403，项目成员关系不变

#### Scenario: 拒绝未知用户或重复成员

- **WHEN** owner 邀请不存在的用户或已经是成员的用户
- **THEN** 系统返回 HTTP 404 或 HTTP 409，项目成员关系不变

### Requirement: 项目访问授权

任务相关受保护请求 MUST 在认证成功后校验当前用户是任务所属项目成员；项目成员可读取和创建该项目任务，owner 或 member 均可更新任务状态。

#### Scenario: 项目成员访问项目任务

- **WHEN** 项目成员携带有效令牌访问所属项目的任务
- **THEN** 系统放行请求并返回任务结果

#### Scenario: 非成员访问项目任务

- **WHEN** 已认证但不属于任务所属项目的用户访问任务
- **THEN** 系统返回 HTTP 403，任务数据不泄露
