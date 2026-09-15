## 1. 规格与模块

- [x] 1.1 完成请求可观测性和数据库健康检查的 proposal、spec、design
- [x] 1.2 新增 `HealthModule`、`HealthService` 和 `GET /health`

## 2. 请求横切能力

- [x] 2.1 实现请求 ID 生成/透传和结构化 HTTP 日志拦截器
- [x] 2.2 实现统一异常过滤器，保留既有错误字段并补充 `requestId`
- [x] 2.3 在 `main.ts` 注册全局拦截器和过滤器

## 3. 测试与文档

- [x] 3.1 增加健康服务单元测试和横切组件单元测试
- [x] 3.2 扩展 Fastify E2E 测试，覆盖健康、请求 ID 和异常响应
- [x] 3.3 更新学习路线和 README 的工程横切能力进度

## 4. 验证

- [x] 4.1 运行 lint、单元测试、集成测试、E2E 测试和构建
- [x] 4.2 运行 OpenSpec validate、`git diff --check` 并复核关键变更
