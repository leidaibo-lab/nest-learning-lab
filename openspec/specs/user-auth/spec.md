# user-auth Specification

## Purpose
TBD - created by archiving change add-auth-and-authorization. Update Purpose after archive.
## Requirements
### Requirement: 注册用户

系统 MUST 接受合法且唯一的邮箱和密码，使用不可逆密码哈希保存用户，并返回用户基本信息和可用于后续请求的访问令牌；响应 MUST NOT 返回密码或密码哈希。

#### Scenario: 使用合法凭据注册

- **WHEN** 客户端向 `POST /auth/register` 提交合法邮箱和至少 8 位密码
- **THEN** 系统返回 HTTP 201、用户 ID、标准化邮箱和 JWT accessToken，响应不包含密码字段

#### Scenario: 拒绝重复邮箱

- **WHEN** 客户端使用已经注册的邮箱再次注册
- **THEN** 系统返回 HTTP 409，且数据库中只保留一个用户

#### Scenario: 拒绝非法注册请求

- **WHEN** 客户端提交缺少邮箱、非法邮箱、过短密码或未知字段
- **THEN** 系统返回 HTTP 400，且不创建用户

### Requirement: 用户登录

系统 MUST 校验邮箱和密码，凭据正确时签发包含用户标识和过期时间的 JWT；JWT accessToken 的有效期 MUST 为 15 分钟，并包含受校验的 issuer 和 audience；凭据错误时 MUST 使用统一的 HTTP 401 响应，不泄露邮箱是否存在。

#### Scenario: 签发十五分钟有效的访问令牌

- **WHEN** 已注册用户向 `POST /auth/login` 提交正确邮箱和密码
- **THEN** 系统返回 HTTP 200 和可验证的 JWT accessToken，且 `exp - iat` 等于 `900` 秒

### Requirement: 认证 Guard

受保护接口 MUST 要求 `Authorization: Bearer <token>`，认证 Guard MUST 在请求上下文中提供当前用户；缺少、格式错误、签名错误或过期的令牌 MUST 在进入 Controller 前返回 HTTP 401。

#### Scenario: 使用有效令牌访问受保护接口

- **WHEN** 客户端携带登录接口签发的 Bearer Token 访问受保护接口
- **THEN** Guard 放行请求并使 Controller 能通过当前用户 Decorator 获取用户 ID

#### Scenario: 使用无效令牌访问受保护接口

- **WHEN** 客户端未携带令牌或携带签名无效的令牌访问受保护接口
- **THEN** 系统返回 HTTP 401，Controller 不被调用
