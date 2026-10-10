# service-health Specification

## ADDED Requirements

### Requirement: 提供独立的存活探针

系统 MUST 提供不要求认证的 `GET /health/live` 接口。进程能够处理请求时，接口 MUST 返回 HTTP 200 和 `process: up`，且不得依赖数据库查询。

#### Scenario: 进程仍可响应

- **WHEN** 客户端请求 `GET /health/live`
- **THEN** 系统返回 HTTP 200
- **AND** 响应状态为 `ok`
- **AND** 响应将进程标记为 `up`

### Requirement: 提供独立的就绪探针

系统 MUST 提供不要求认证的 `GET /health/ready` 接口，通过轻量数据库查询判断实例是否可以接收流量。数据库可用时 MUST 返回 HTTP 200；数据库不可用时 MUST 返回 HTTP 503。

#### Scenario: 关键依赖可用

- **WHEN** 客户端请求 `GET /health/ready` 且数据库查询成功
- **THEN** 系统返回 HTTP 200
- **AND** 响应状态为 `ok`
- **AND** 数据库检查标记为 `up`

#### Scenario: 关键依赖不可用

- **WHEN** 客户端请求 `GET /health/ready` 且数据库查询失败
- **THEN** 系统返回 HTTP 503
- **AND** 响应状态为 `error`
- **AND** 数据库检查标记为 `down`

### Requirement: 保持既有健康检查兼容

系统 MUST 保留 `GET /health` 的现有响应和数据库检查行为；新增探针不得要求用户身份认证。

#### Scenario: 旧健康检查仍可用

- **WHEN** 未携带 Bearer Token 的客户端请求 `GET /health`
- **THEN** 系统继续执行数据库健康检查并返回既有响应结构
