# service-health Specification

## MODIFIED Requirements

### Requirement: 就绪探针必须在实例排空时拒绝流量

系统 MUST 提供不要求认证的 `GET /health/ready` 接口，通过数据库检查判断实例是否可以接收流量；当应用进入 draining 状态后，即使数据库可用，也 MUST 返回 HTTP 503。

#### Scenario: 停机排空期间拒绝新流量

- **WHEN** 应用已进入 draining 状态且客户端请求 `GET /health/ready`
- **THEN** 系统返回 HTTP 503
- **AND** 响应原因标记为 `draining`
- **AND** 不再发起数据库健康检查

### Requirement: 存活探针在排空期间保持可用

应用进入 draining 状态后，`GET /health/live` MUST 继续返回 HTTP 200，只要进程仍能处理请求。

#### Scenario: 排空中的进程仍然存活

- **WHEN** 应用已进入 draining 状态且客户端请求 `GET /health/live`
- **THEN** 系统返回 HTTP 200
- **AND** 响应仍将进程标记为 `up`
