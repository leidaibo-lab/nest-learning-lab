## Why

当前认证实现使用手写 JWT，且 Access Token 生命周期决策尚未按成熟项目方案收敛。本次改为使用 `@nestjs/jwt` 统一签发与验证，并将 Access Token 设为短期 15 分钟，保留后续 Refresh Token 的演进空间。

## What Changes

- 使用 `@nestjs/jwt` 替换手写 JWT 签发与验证。
- 使用 HS256、`issuer`、`audience` 和 15 分钟 `exp` 配置认证令牌。
- 保持 Bearer Token 的认证流程和 HTTP 响应结构不变。

## Impact

- 模块：`AuthModule`、`JwtAuthGuard` 和 JWT 配置。
- HTTP：注册和登录响应中的 `accessToken` 有效期变化，认证接口契约保持不变。
- 测试：覆盖有效期、issuer、audience 和非法 Token。

## Non-Goals

- 不实现刷新 Token、撤销 Token 或持久化 Token。
- 不改变 JWT 签名算法、请求头格式和用户认证逻辑。
