# 通知容量基线与故障演练

本阶段先验证“数据库短暂不可用 -> 延迟重试 -> 恢复扫描”和“重试等待中开始排空 -> 不再认领”两条路径。自动化证据见 `src/notifications/notification.processor.spec.ts` 中的 `retries a failed database scan after a delay and recovers` 与 `stops a pending database retry when the instance starts draining`。

fake timers 证明的是调度顺序和状态边界，不测量真实吞吐；fake Prisma 证明的是调用边界，不替代 PostgreSQL 条件更新和唯一约束验证。

## 已实现的容量观测入口

启动应用并触发任务状态更新后，`NotificationProcessor` 会通过 Nest Logger 输出 JSON：

| event | 字段 | 含义 |
| --- | --- | --- |
| notification.batch | backlog、processedJobs、outcome、durationMs | 每批开始的未完成任务快照、本批结束的尝试数、循环结果及总耗时 |
| notification.attempt | jobId、attempts、outcome、durationMs | 单次处理尝试的标识、累计认领次数、围栏确认结果与耗时 |
| notification.drain | durationMs | onModuleDestroy 等待活动循环结束的耗时 |

`backlog` 统计所有租户的 pending/processing，包含退避等待与活跃租约，不等于可立即认领任务数；计数查询失败输出 null，继续认领。快照与后续任务更新不在同一事务中，不能用于业务一致性判断。每批多一次 count 查询，会增加数据库负担。

尝试结果为 completed、pending、failed、lease_lost 或 error。通知写入后如果围栏更新失败，结果仍为 lease_lost；失败记录再次抛错则为 error。`processedJobs` 统计走完处理函数的尝试，包含失败和失去租约，不是成功通知数。日志不包含通知内容或 leaseToken。

`durationMs` 使用 performance.now() 单调时钟。批次耗时包含 backlog 查询和认领，尝试耗时包含处理与失败记录，排空耗时不包含信号到钩子调用的时间，也不等于进程退出总时长。日志中尚无单查询耗时或连接池占用；数据库压力仍需独立采集。

学习时先选定同一实例、同一负载、同一时间窗口，收集 notification.attempt 的原始耗时，按 outcome 分组后排序计算 p50/p95/p99，并同时报告样本数。不能只保留 completed 样本后声称故障期间延迟正常，也不能把少量 mock 样本作为容量结果。

## 容量记录模板

每次演练记录提交版本、硬件、实例数、数据库版本、连接池配置、初始 backlog、注入速率和故障持续时间。不可记录密码、Token 或真实通知内容。

| 观察项 | 记录内容 | 参数校准目的 |
| --- | --- | --- |
| backlog | 演练前后待处理数、最老任务年龄 | 判断消费者是否跟得上输入 |
| 处理耗时 | 单任务 p50/p95/p99、样本数、采样窗口 | 检查 30 秒租约与 10 秒续期假设 |
| 数据库压力 | 查询耗时、错误数、连接使用量 | 判断续租和批次是否加重依赖压力 |
| 停机延迟 | 信号时间、最后认领时间、当前任务结束时间 | 校准部署终止宽限期 |
| 一致性 | 任务终态、租约令牌、重复通知数量 | 判断恢复后是否收敛 |

## 受控故障步骤

### 本次已验证：慢续租与单次心跳失败

`handles a slow renewal heartbeat during a long task and drains all queries` 使用 deferred Promise 挂住任务事件查询及周期续租查询，再用 fake timers 跨过 10 秒、20 秒、30 秒。断言周期续租没有重叠；当前任务终态写入后，关闭流程仍等待未返回的心跳，最后没有遗留定时器或新认领。

`handles a failure renewal heartbeat during a long task and drains all queries` 注入一次心跳查询异常，随后让副作用前的主动续租成功，验证当前任务仍可完成。一次网络错误只能说明这次续租没有获得成功确认，不能直接推断数据库中的租约已经失效；处理权仍由条件更新仲裁。

这里学习两个不同的时间边界：`setInterval` 不等待 async 回调；`clearInterval` 不取消已经发送的查询。代码通过在途 Promise 限制周期心跳并发，收尾时先停定时器再等待查询。主动续租仍可能与周期心跳并发，状态/令牌围栏保护终态。

mock 故意返回仍有效的租约，这只能证明应用编排。它没有证明处理超过 30 秒时真实数据库租约一定有效，也没有模拟操作系统暂停或杀进程。数据库查询永久挂起时，排空仍需等待；查询超时和部署终止宽限期需要单独验证。

仅在独立测试数据库执行，每次从已知任务集开始，记录故障前后状态。

1. 暂时阻断数据库访问，观察延迟重试；恢复访问后验证 backlog 能继续下降。
2. 在任务处理中暂停消费者，跨过租约期限后恢复，验证旧令牌不能覆盖重新认领后的终态。
3. 对消费者发送 `SIGTERM`，记录停止新认领与当前任务结束的时间。
4. 使用独立测试进程演练强制终止；等待租约过期后启动另一消费者，核对任务完成和通知唯一约束。

事件循环暂停、强制终止和真实数据库恢复尚未在本次会话执行，不能标记为通过。一次本地结果也不能推出生产 SLO；应在目标部署环境重复演练并保留样本分布。
