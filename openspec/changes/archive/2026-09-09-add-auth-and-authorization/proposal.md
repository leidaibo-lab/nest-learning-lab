## Why

当前任务接口没有用户身份和项目边界，任何调用方都可以读取或修改任意任务，无法体现任务管理系统的真实协作权限。第四阶段已经具备持久化和事务基础，本阶段补齐认证与项目成员授权，学习 NestJS Guard、请求用户 Decorator 和 JWT 请求生命周期。

## What Changes

- 新增用户注册和登录接口，使用密码哈希保存凭据并签发短期 JWT。
- 新增项目创建和成员管理接口，创建者成为项目所有者，可邀请其他已注册用户加入项目。
- 为任务增加项目归属；创建、查询和状态更新要求当前用户是项目成员。
- 使用认证 Guard 解析 Bearer Token，使用项目访问 Guard 和角色 Decorator 执行成员/所有者授权。
- 对缺少凭据、无效 Token、重复邮箱、无效成员和越权操作返回可区分的 HTTP 错误。
- **BREAKING** 任务创建请求必须携带 `projectId`，任务接口必须携带 Bearer Token。

## Capabilities

### New Capabilities

- `user-auth`: 用户注册、登录、密码凭据和 JWT 认证请求。
- `project-membership`: 项目创建、成员邀请和项目角色授权。

### Modified Capabilities

- `task-management`: 任务必须属于项目，并限制项目成员访问任务。

## Impact

- 模块：新增 `AuthModule`、`ProjectsModule`、认证/授权 Guards 和当前用户 Decorator；扩展 `TasksModule`。
- HTTP：新增 `POST /auth/register`、`POST /auth/login`、`POST /projects`、`POST /projects/:id/members`；修改任务创建和任务读写接口的认证要求。
- 数据库：新增 User、Project、ProjectMember 表，Task 增加 projectId 外键和索引，并添加版本化迁移。
- 配置：新增 `JWT_SECRET` 环境变量及启动校验。
- 测试：增加密码/JWT/Service 单元测试、Repository 集成测试和认证授权 E2E 测试。

## Non-Goals

- 不实现刷新 Token、密码找回、第三方登录或细粒度资源策略引擎。
- 不实现项目删除、成员移除、任务转移项目或任务负责人分配。
- 不引入 Passport 适配器；本阶段使用 NestJS Guard 封装 Node 内置 JWT 签名验证，后续可替换为 Passport Strategy。
