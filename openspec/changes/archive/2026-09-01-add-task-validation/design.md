## Context

第一阶段的 `TasksService` 直接检查标题类型和空白，HTTP 请求进入 Controller 后才触发错误。NestJS 的 `ValidationPipe` 可以利用 DTO 元数据在 Controller 调用前完成运行时校验，因此本阶段把“输入是否符合契约”移到请求生命周期的 Pipe 层。

## Goals / Non-Goals

**Goals:**

- 在 `main.ts` 全局注册 `ValidationPipe`。
- 使用 `class-validator` 和 `class-transformer` 实现 DTO 运行时校验。
- 开启 `transform`、`whitelist` 和 `forbidNonWhitelisted`，明确未知字段策略。
- 保持现有合法任务创建行为和标准化标题结果不变。

**Non-Goals:**

- 不改变任务查询、Repository 或持久化边界。
- 不定制异常过滤器或改造 Nest 默认错误响应结构。
- 不实现复杂跨字段业务规则。

## Decisions

### 1. 全局注册 ValidationPipe

在 `NestFactory.create` 后调用 `app.useGlobalPipes`，让所有 HTTP Controller 共享同一输入契约策略。相比仅在 `TasksController` 使用，能够展示全局 Pipe 的作用范围，并为后续模块保持一致行为。

### 2. 使用 `IsString`、`IsNotEmpty`、`MaxLength`

DTO 负责类型、非空和长度约束；`IsNotEmpty` 与 `Transform` 配合检查去除空白后的值。Service 继续执行 `trim`，因为标准化是业务输出规则而不是纯输入格式规则。

### 3. 开启 forbidNonWhitelisted

仅开启 `whitelist` 会静默删除未知字段，容易掩盖客户端拼写错误。本阶段选择同时开启 `forbidNonWhitelisted`，让错误尽早暴露，并通过 E2E 测试固定契约。

## Risks / Trade-offs

- [全局 Pipe 影响未来所有模块] → 新增 DTO 时必须同步编写验证场景。
- [class-validator 装饰器增加运行时依赖] → 依赖已是 Nest 生态标准，版本锁定在 pnpm-lock.yaml。
- [默认错误消息暴露字段规则] → 当前适合学习和开发环境，生产环境再设计错误码与脱敏策略。

## Migration Plan

1. 安装校验依赖并更新锁文件。
2. 更新 DTO、应用入口和 Service。
3. 扩展单元与 E2E 测试。
4. 通过验证后归档规格。

## Open Questions

无。

## 实施回顾

- `CreateTaskDto` 通过 `Transform`、`IsString`、`IsNotEmpty` 和 `MaxLength` 建立运行时输入契约。
- `main.ts` 与 E2E 测试应用均注册了 `ValidationPipe`，配置 `transform`、`whitelist` 和 `forbidNonWhitelisted`。
- `TasksService` 保留标题 `trim` 标准化，移除与 DTO 重复的类型和空值检查。
- 单元测试共 3 个套件、9 个用例通过；E2E 测试共 1 个套件、8 个用例通过。
- 新增 `class-validator` 与 `class-transformer`，锁文件同步更新。
- 变更检索确认请求校验发生在 Controller 调用前，非法请求不会进入任务创建业务。
