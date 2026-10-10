# 实施任务

- [x] 新增应用生命周期 Provider，在 `beforeApplicationShutdown` 进入 draining 状态。
- [x] 让 `/health/ready` 在 draining 状态返回 503，并保持 `/health/live` 可用。
- [x] 让 NotificationProcessor 停止新调度、续批和认领，同时等待当前任务完成。
- [x] 捕获后台查询异常并延迟重试，避免依赖故障造成未处理 Promise rejection。
- [x] 添加中文注释，说明流量摘除、后台排空、终止宽限期和租约恢复边界。
- [x] 增加生命周期、健康探针和通知处理器单元测试。
- [ ] 运行 lint、单元测试、构建、OpenSpec validate、集成测试和 E2E。
