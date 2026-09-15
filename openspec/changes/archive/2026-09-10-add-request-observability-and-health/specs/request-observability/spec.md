## ADDED Requirements

### Requirement: 为 HTTP 请求提供关联标识

系统 MUST 为每个 HTTP 请求生成安全的请求标识，写入响应头 `x-request-id`；当请求携带符合允许字符和长度限制的 `x-request-id` 时，系统 MUST 透传该标识，否则 MUST 生成新的标识。

#### Scenario: 请求标识透传到成功响应

- **WHEN** 客户端携带合法的 `x-request-id` 请求任意公开接口
- **THEN** 响应返回相同的 `x-request-id` 请求头

#### Scenario: 缺少或非法请求标识时生成新标识

- **WHEN** 客户端未携带请求标识或携带超出限制的请求标识
- **THEN** 响应返回新的非空 `x-request-id`，且不使用非法输入作为请求标识

### Requirement: 记录结构化 HTTP 请求日志

系统 MUST 为成功和失败的 HTTP 请求输出结构化日志，至少包含事件名、请求标识、HTTP 方法、请求路径、状态码和耗时；日志 MUST NOT 包含 Authorization Header、密码或请求体。

#### Scenario: 成功请求产生日志

- **WHEN** HTTP 请求正常完成
- **THEN** 系统输出包含 `http.request`、请求标识和最终状态码的结构化日志

#### Scenario: 异常请求产生日志

- **WHEN** HTTP 请求由 HTTP 异常或未知异常结束
- **THEN** 系统输出包含请求标识和对应错误状态码的结构化日志，并继续交由异常过滤器生成响应

### Requirement: 统一异常关联字段

系统 MUST 在 HTTP 异常响应中返回 `requestId`；未知异常 MUST 返回 HTTP 500 和通用错误信息，不得泄露异常对象的内部消息或堆栈。

#### Scenario: 校验异常包含请求标识

- **WHEN** 客户端提交不符合 DTO 约束的请求
- **THEN** 系统返回原有 HTTP 400 错误契约并增加与响应头一致的 `requestId`

#### Scenario: 未知异常隐藏内部细节

- **WHEN** Controller 或 Provider 抛出未包装的异常
- **THEN** 系统返回 HTTP 500、通用错误信息和 `requestId`，且响应不包含内部异常消息
