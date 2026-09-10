## MODIFIED Requirements

### Requirement: 用户登录

系统 MUST 校验邮箱和密码，凭据正确时签发包含用户标识和过期时间的 JWT；JWT accessToken 的有效期 MUST 为 15 分钟，并包含受校验的 issuer 和 audience；凭据错误时 MUST 使用统一的 HTTP 401 响应，不泄露邮箱是否存在。

#### Scenario: 签发十五分钟有效的访问令牌

- **WHEN** 已注册用户向 `POST /auth/login` 提交正确邮箱和密码
- **THEN** 系统返回 HTTP 200 和可验证的 JWT accessToken，且 `exp - iat` 等于 `900` 秒
