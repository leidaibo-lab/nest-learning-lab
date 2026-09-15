## ADDED Requirements

### Requirement: 提供数据库健康检查

系统 MUST 提供不要求认证的 `GET /health` 接口，通过一次轻量数据库查询检查数据库连通性；数据库可用时返回 HTTP 200，数据库不可用时返回 HTTP 503。

#### Scenario: 数据库可用

- **WHEN** 客户端请求 `GET /health` 且数据库查询成功
- **THEN** 系统返回 HTTP 200，状态为 `ok`，并将数据库检查标记为 `up`

#### Scenario: 数据库不可用

- **WHEN** 客户端请求 `GET /health` 且数据库查询失败
- **THEN** 系统返回 HTTP 503，状态为 `error`，并将数据库检查标记为 `down`

#### Scenario: 健康检查不要求用户身份

- **WHEN** 未携带 Bearer Token 的客户端请求 `GET /health`
- **THEN** 系统仍执行健康检查，不返回 HTTP 401
