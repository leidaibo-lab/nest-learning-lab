## Context

当前认证实现手写 JWT 签名和验证，且 Access Token 生命周期与生产实践不一致。本次使用 `@nestjs/jwt` 提供的成熟封装，并保留自定义 Guard 处理 Bearer Header、用户加载和请求上下文。

## Decision

在 `AuthModule` 使用 `JwtModule.registerAsync` 注入配置，固定 HS256，设置 15 分钟 `expiresIn`，并校验 `issuer` 与 `audience`。选择 `@nestjs/jwt` 11.x 与 Nest 11 对齐，避免使用 12.x ESM 包改造现有 Jest CommonJS 测试环境。

## Verification

通过 `@nestjs/jwt` 配置测试验证 `exp - iat` 等于 900 秒、issuer/audience 校验有效，并运行 lint、单元测试和构建。
