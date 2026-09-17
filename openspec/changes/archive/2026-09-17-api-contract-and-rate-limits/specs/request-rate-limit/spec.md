## ADDED Requirements

### Requirement: 限制全局请求频率

系统 MUST 使用配置中的 `THROTTLE_TTL` 和 `THROTTLE_LIMIT` 对认证请求之外的 HTTP 请求执行内存限流；同一客户端在窗口内超过限制时 MUST 返回 HTTP 429。

#### Scenario: 普通请求超过全局限制

- **WHEN** 同一客户端在 `THROTTLE_TTL` 窗口内发送超过 `THROTTLE_LIMIT` 个普通 HTTP 请求
- **THEN** 超出窗口配额的请求返回 HTTP 429，并包含现有错误响应中的 `requestId`

### Requirement: 保护认证入口

注册和登录接口 MUST 使用比全局默认值更严格的独立限流策略；认证入口超限 MUST 返回 HTTP 429，且不得进入密码校验或用户创建业务逻辑。

#### Scenario: 登录入口超限

- **WHEN** 同一客户端在认证入口窗口内连续发送超过 5 次登录请求
- **THEN** 后续请求返回 HTTP 429

### Requirement: 校验限流配置

系统 MUST 校验 `THROTTLE_TTL` 和 `THROTTLE_LIMIT` 为正整数；配置缺失时 MUST 使用文档化的安全默认值。

#### Scenario: 限流配置非法

- **WHEN** `THROTTLE_TTL` 或 `THROTTLE_LIMIT` 不是正整数
- **THEN** 应用启动配置校验失败并返回可定位的错误
