# 项目逻辑与流程图

本目录用于集中维护项目的静态架构图、业务流程图和运行时观测图。图中的节点必须能回到代码、规格或测试，不维护脱离实现的示意图。

## 推荐阅读顺序

1. [模块架构](module-architecture.md)：先理解 Module、Provider、Repository 和 PostgreSQL 的边界。
2. [NestJS 请求生命周期](../knowledge/nest-request-lifecycle.md)：理解 Guard、Interceptor、Pipe、Controller 和异常分支的执行顺序。
3. [通知任务流程](notification-flow.md)：理解任务状态更新后，outbox、租约、重试、幂等和背压如何衔接。
4. [运行时观测](runtime-observability.md)：按请求 ID、健康探针和后台任务日志排查一次真实运行。
5. [测试证据地图](test-evidence-map.md)：查找每条关键流程由哪个规格和测试证明。

## 文档边界

| 文档 | 回答的问题 | 主要依据 |
| --- | --- | --- |
| `module-architecture.md` | 模块和基础设施如何连接？ | `src/*/`、`AppModule` |
| `../knowledge/nest-request-lifecycle.md` | HTTP 请求按什么顺序执行？ | `main.ts`、全局 Provider、Controller |
| `notification-flow.md` | 异步通知如何处理失败、重复和实例故障？ | `NotificationProcessor`、OpenSpec |
| `runtime-observability.md` | 运行时从哪里观察和排障？ | 日志、健康检查、Swagger |
| `test-evidence-map.md` | 哪个测试证明哪条行为？ | `src/**/*.spec.ts`、`test/` |

## 更新约定

- Module、Provider 或数据边界变化时，更新 `module-architecture.md`。
- Guard、Pipe、Interceptor、Filter 或请求顺序变化时，优先更新 `docs/knowledge/nest-request-lifecycle.md`。
- 异步状态、租约、重试、幂等或批次策略变化时，更新 `notification-flow.md`，同时检查对应 OpenSpec 和测试。
- 新增日志、探针或运行时入口时，更新 `runtime-observability.md`。
- 每个流程节点尽量标注源文件或测试文件，避免只留下概念名称。
- 文档变更完成后运行 `git diff --check`，并在 README 保持入口链接有效。
