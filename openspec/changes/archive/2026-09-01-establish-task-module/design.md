## Context

当前 `AppModule` 直接注册空的 `TestDemoController`，没有独立业务模块，也没有体现接口与实现分离的 Provider 用法。第一阶段需要以尽可能少的组件完成任务创建与查询，同时让依赖图、请求链路和可替换基础设施边界清晰可见。

请求链路如下：

```text
Fastify request
  -> TasksController
  -> TasksService
  -> TASK_REPOSITORY
  -> InMemoryTaskRepository
```

## Goals / Non-Goals

**Goals:**

- 使用 `TasksModule` 封装任务能力，由 `AppModule` 通过 `imports` 引入。
- 使用构造器注入和 Symbol Token 展示 NestJS IoC 容器如何解析抽象依赖。
- 提供创建与按 ID 查询两条完整 HTTP 链路。
- 让 Service 业务行为可独立单元测试，让 HTTP 契约可通过 Fastify E2E 测试验证。

**Non-Goals:**

- 不引入数据库、ORM、事务或跨进程持久化。
- 不引入 `class-validator`、全局 `ValidationPipe` 或统一异常响应格式。
- 不实现更新、删除、列表、认证或授权。
- 不拆分微服务或共享库。

## Decisions

### 1. 使用功能模块作为业务边界

`TasksModule` 自己注册 Controller、Service 和 Repository Provider，`AppModule` 只导入模块。相比继续在根模块堆叠组件，这种结构能够展示 NestJS 模块封装，并为后续项目、用户等能力保留清晰边界。

### 2. 使用 Symbol 作为 Repository Token

TypeScript interface 运行时不存在，不能直接作为注入 Token，因此定义 `TASK_REPOSITORY` Symbol，并用 `@Inject(TASK_REPOSITORY)` 注入。模块通过 `useClass` 将 Token 绑定到 `InMemoryTaskRepository`。相比让 Service 直接依赖实现类，该方案允许第三阶段仅替换 Provider 注册即可接入数据库。

### 3. Repository 接口从一开始使用异步方法

内存 Map 本身是同步的，但 `save` 和 `findById` 返回 Promise，使应用层契约与未来数据库 I/O 一致，避免持久化阶段修改 Service 和 Controller 的调用模型。

### 4. Service 负责本阶段的最小输入规则

本阶段在 `TasksService` 中检查标题是否为字符串且去除首尾空白后非空，并抛出 NestJS `BadRequestException`。这是为了覆盖非法输入且不提前引入第二阶段的 Pipe；第二阶段将重新评估校验位置和统一异常契约。

### 5. 使用进程内 Map 和 Node.js UUID

Repository 使用 Map 保存任务，任务 ID 使用 `node:crypto` 的 `randomUUID()` 生成。该实现无需新增依赖，并且每个 Nest 应用实例拥有独立存储，适合单元测试与 E2E 测试隔离。

## Risks / Trade-offs

- [应用重启后任务丢失] → 明确作为第一阶段限制，第三阶段由数据库实现替换。
- [Service 暂时依赖 HTTP 异常类型] → 第二阶段设计请求生命周期和错误契约时再拆分领域错误映射。
- [内存 Repository 默认单例导致同一应用实例内测试互相影响] → E2E 测试每个用例创建并关闭独立 Nest 应用。
- [当前 DTO 没有运行时校验元数据] → Service 保留运行时类型和空白检查，第二阶段引入标准 DTO 校验。

## Migration Plan

1. 新增 `src/tasks/` 内的模块、领域类型、DTO、Service、Repository 抽象和内存实现。
2. 在 `AppModule` 中导入 `TasksModule`。
3. 移除未使用的 `src/test-demo/` 示例。
4. 增加单元测试与 E2E 测试并运行完整验证。

回滚时恢复 `TestDemoController` 注册并删除 `TasksModule` 相关文件；本阶段没有数据迁移。

## Open Questions

无。数据库选型、统一错误结构和 DTO 校验策略分别留到后续阶段决策。

## 实施回顾

- `AppModule` 从直接注册空的演示 Controller，调整为通过 `imports` 引入 `TasksModule`。
- `src/tasks/` 新增 8 个源文件，形成 Controller、Service、Repository Token 与内存实现的完整依赖链。
- 删除 `src/test-demo/` 下 3 个未承载业务行为的文件，没有保留兼容路由。
- 单元测试共 2 个套件、7 个用例通过；E2E 测试共 1 个套件、4 个用例通过。
- 本次没有新增第三方依赖，`package.json` 与 `pnpm-lock.yaml` 均无变更。
- 严格校验暴露并修复了两项实现细节：装饰器签名中的 interface 使用 `import type`，同步内存实现通过 `Promise.resolve` 满足异步 Repository 契约且避免无效 `async`。
