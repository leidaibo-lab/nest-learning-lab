## Implementation

- [x] 使用与 Nest 11 对齐的 `@nestjs/jwt` 替换手写 JWT
- [x] 将 JWT accessToken 有效期设置为 15 分钟并增加 issuer/audience 校验
- [x] 使用 Argon2id 替换密码主路径，并兼容旧 scrypt 哈希自动升级
- [x] 增加 JWT 配置和密码迁移测试
- [x] 更新认证规格并完成 lint、测试和构建验证
