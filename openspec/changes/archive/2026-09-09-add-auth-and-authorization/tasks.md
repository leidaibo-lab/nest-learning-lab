## 1. 规格与数据模型

- [x] 1.1 完成认证、项目成员和任务归属的 OpenSpec 规格与设计
- [x] 1.2 扩展 Prisma schema，新增 User、Project、ProjectMember，并给 Task 增加 projectId 外键与索引
- [x] 1.3 创建前向数据库 migration，运行 Prisma Client 生成并补充环境变量校验

## 2. 认证模块

- [x] 2.1 实现密码哈希/校验和 HS256 JWT 签发/验证 Provider
- [x] 2.2 实现注册、登录 DTO、Service、Controller 和 AuthModule
- [x] 2.3 实现 JwtAuthGuard、CurrentUser Decorator，并覆盖无 Token、篡改 Token 和过期 Token

## 3. 项目与授权

- [x] 3.1 实现项目 Repository、Service、创建项目接口及 owner 成员事务
- [x] 3.2 实现成员邀请 DTO、接口和 owner 角色校验
- [x] 3.3 实现 ProjectAccessGuard、Roles Decorator/Guard，并覆盖成员、非成员和非 owner 场景

## 4. 任务链路

- [x] 4.1 扩展 Task 领域模型、DTO、Repository 和 Prisma 映射以携带 projectId
- [x] 4.2 为任务路由接入认证和项目访问授权，保持状态更新事务与错误契约
- [x] 4.3 更新任务 Service 单元测试和 Prisma 集成测试
- [x] 4.4 更新 Fastify E2E fixture，覆盖注册登录、项目成员、任务越权和旧请求拒绝

## 5. 验证与文档

- [x] 5.1 更新学习路线、README 或环境示例，记录认证与授权的学习要点
- [x] 5.2 运行 lint、单元测试、集成测试、E2E 测试、构建、OpenSpec validate 和 git diff --check
- [x] 5.3 复核 git diff 与 git diff --stat，确认提交信息符合 `type(scope): message`
