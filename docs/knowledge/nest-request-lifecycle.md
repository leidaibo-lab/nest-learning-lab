# NestJS 多场景请求生命周期

这张图同时描述成功请求、请求短路、异常处理和异步副作用。`Service` 与 `Repository` 属于应用架构层，不是 Nest 自动执行的生命周期钩子。

```mermaid
flowchart TD
    A["客户端请求"] --> B["Middleware<br/>全局 / 模块 / 路由"]
    B --> C["Guard<br/>全局 → Controller → Route"]

    C -- "拒绝请求<br/>限流 / 未认证 / 越权" --> F["Exception Filter"]
    C --> D["Interceptor pre<br/>前置逻辑"]

    D --> E["Pipe<br/>参数解析 / 转换 / 校验"]

    E -- "参数非法" --> F
    E --> G["Controller<br/>路由匹配 / 参数组装"]

    G --> H["Service<br/>业务规则与编排"]

    H --> I["Repository<br/>数据访问抽象"]
    I --> J["MySQL / Redis / 外部服务"]

    J --> I
    I --> H
    H --> G

    H --> K["Interceptor post<br/>响应后置处理"]
    G --> K
    K --> L["HTTP 成功响应"]
    L --> A

    H -- "业务异常 / 数据库异常" --> F
    D -- "拦截器异常" --> F

    H -. "写入 Outbox / 发布事件" .-> M["后台任务 / 消息消费者"]
    M -. "异步处理，不阻塞当前 HTTP 响应" .-> N["通知 / 其他副作用"]

    F --> O["HTTP 错误响应"]
    O --> A
```

## 阅读要点

- `Middleware → Guard → Interceptor pre → Pipe → Controller` 是请求进入 Nest 处理链的大致顺序。
- Guard 或 Pipe 拒绝请求后，后续的 Controller、Service、Repository 都不会执行。
- `Interceptor post` 是前置拦截器包裹的后置逻辑，成功响应时最容易观察到。
- `Exception Filter` 是异常分支，不是每次请求都会经过的固定环节。
- 异步消费者已经脱离当前 HTTP 请求生命周期，不是响应返回前的必经步骤。
