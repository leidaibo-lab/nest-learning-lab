## Why

第一阶段的标题校验位于 Service 内部，只能覆盖最小规则，无法系统展示 NestJS 请求生命周期中的 Pipe，也无法统一处理未知字段、类型转换和验证错误。第二阶段将把输入契约提升到 DTO 与全局 `ValidationPipe`，让 HTTP 层在进入 Controller 前完成校验。

## What Changes

- 为 `CreateTaskDto` 增加 `class-validator` 装饰器，要求标题为字符串且长度在 1 到 120 个字符之间。
- 在应用入口启用全局 `ValidationPipe`，开启转换、白名单和禁止未知字段。
- 统一非法请求的 HTTP 400 响应，保留 Nest 默认异常结构。
- 为合法输入保留标题首尾空白清理，并删除 Service 中重复的类型校验。
- 补充 DTO 单元验证和 HTTP E2E 场景。

## Capabilities

### New Capabilities

- `task-validation`: 定义任务创建请求的运行时输入校验和错误响应。

### Modified Capabilities

- `task-management`: 创建任务的标题规则从 Service 最小检查提升为 DTO 与全局 Pipe 约束。

## Impact

- 应用入口：`src/main.ts` 增加全局 `ValidationPipe`。
- 任务输入：`src/tasks/create-task.dto.ts` 增加校验装饰器。
- 业务服务：`TasksService` 移除重复的输入类型检查，保留业务标准化逻辑。
- 依赖：新增 `class-validator` 与 `class-transformer`。
- 测试：覆盖缺失、空白、超长、未知字段和合法请求。
