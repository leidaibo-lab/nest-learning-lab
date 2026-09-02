# 项目中的 Prisma 能力组成

本文记录 Prisma 在本项目中的实际职责和使用边界。这里讨论的是 Prisma 相关能力，不是 NestJS 的通用 API。

## 1. Prisma 在项目中的位置

```text
schema.prisma
    ↓ prisma generate
generated/prisma
    ↓ PrismaClient
PrismaService
    ↓
PrismaTaskRepository
    ↓ TASK_REPOSITORY Provider
TasksService
```

Prisma 负责数据库访问和类型生成；NestJS 负责模块组装、依赖注入和生命周期管理；Repository 负责隔离 Prisma 类型与任务领域模型。

## 2. 当前文件职责

| 文件 | 职责 |
| --- | --- |
| `prisma/schema.prisma` | 定义 PostgreSQL 数据源、Task 模型和 Client 输出目录 |
| `prisma/migrations/` | 保存版本化数据库结构变更 |
| `src/database/prisma.service.ts` | 继承 `PrismaClient`，读取配置并管理连接/断开 |
| `src/database/database.module.ts` | 全局提供 `PrismaService` |
| `src/tasks/prisma-task.repository.ts` | 将 Repository 操作翻译为 Prisma 查询，并完成模型映射 |
| `src/tasks/task.repository.ts` | 业务层使用的存储抽象，不暴露 Prisma |
| `generated/prisma/` | `prisma generate` 生成的客户端代码与类型，不手动修改 |

## 3. schema 到 API 的生成链路

```text
model Task { ... }
    ↓
pnpm prisma:generate
    ↓
PrismaClient.task
    ↓
create / findUnique / findMany / update / delete ...
```

当前模型：

```prisma
model Task {
  id        String   @id @db.Uuid
  title     String   @db.VarChar(120)
  status    String   @default("todo") @db.VarChar(20)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
}
```

因此客户端会生成：

```ts
prisma.task.create()
prisma.task.findUnique()
prisma.task.findMany()
prisma.task.update()
prisma.task.delete()
```

`task` 是模型操作入口，`create` 等方法是 Prisma 根据模型生成的固定 API。具体参数类型会随 schema、Prisma 版本和字段约束变化。

## 4. 模型级 API

### 写入

```ts
await prisma.task.create({ data: { id, title, status } });
await prisma.task.createMany({ data: tasks });
await prisma.task.update({ where: { id }, data: { status: 'done' } });
await prisma.task.updateMany({ where: { status: 'todo' }, data: { status: 'done' } });
await prisma.task.upsert({ where: { id }, create: task, update: changes });
await prisma.task.delete({ where: { id } });
await prisma.task.deleteMany({ where: { status: 'done' } });
```

### 查询与统计

```ts
await prisma.task.findUnique({ where: { id } });
await prisma.task.findFirst({ where: { status: 'todo' } });
await prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
await prisma.task.count({ where: { status: 'todo' } });
await prisma.task.aggregate({ _count: true });
await prisma.task.groupBy({ by: ['status'], _count: { _all: true } });
```

常见查询参数包括 `where`、`data`、`select`、`include`、`orderBy`、`skip`、`take` 和 `cursor`。字段过滤器支持 `equals`、`contains`、`in`、`gt`、`gte`、`lt`、`lte`、`OR`、`AND`、`NOT` 等操作。

## 5. 客户端级 API

这些 API 不针对某一个模型，而是管理客户端、事务或底层 SQL：

```ts
await prisma.$connect();
await prisma.$disconnect();
await prisma.$transaction(async (transaction) => {
  // 同一个事务中的查询
});
await prisma.$queryRaw`SELECT * FROM tasks`;
await prisma.$executeRaw`UPDATE tasks SET status = 'done'`;
prisma.$on('query', (event) => console.log(event.duration));
```

当前项目使用了 `$connect` 和 `$disconnect`；任务状态更新和操作事件出现后，再引入 `$transaction`。原生 SQL 只在 Prisma API 无法清晰表达时使用，变量必须采用参数化模板。

## 6. 本项目的 Repository 边界

业务层只依赖：

```ts
export interface TaskRepository {
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | undefined>;
}
```

基础设施层才调用：

```ts
await this.prisma.task.create({ data: ... });
await this.prisma.task.findUnique({ where: { id } });
```

这样做的目的：

- Controller 和 Service 不知道 Prisma 的存在。
- 单元测试可以注入 `InMemoryTaskRepository`，不启动数据库。
- 集成测试验证 `PrismaTaskRepository` 与 PostgreSQL 的真实行为。
- 未来替换 ORM 或数据库时，影响集中在 Repository 和基础设施模块。

## 7. 数据模型映射

```text
领域 Task.createdAt: string
        ↓ 保存
new Date(task.createdAt)
        ↓
PostgreSQL TIMESTAMPTZ / Prisma Date
        ↓ 读取
task.createdAt.toISOString()
        ↓
领域 Task.createdAt: string
```

`PrismaTaskRepository` 是映射边界，不能把 Prisma 的 `Date` 类型直接泄漏到领域层。

## 8. 常用命令

```bash
pnpm prisma:generate       # 根据 schema 生成 Client 和类型
pnpm prisma:migrate:deploy # 将已有 migration 部署到数据库
pnpm test:integration      # 测试真实 Prisma Repository
```

修改 `schema.prisma` 后，通常需要重新生成 Client；修改数据库结构时必须创建 migration。生成目录 `generated/prisma` 属于构建产物，不应手动编辑。

## 9. 当前测试分层

```text
TasksService 单元测试
  → InMemoryTaskRepository
  → 快速验证业务规则

PrismaTaskRepository 集成测试
  → PostgreSQL
  → 验证 SQL 映射、Date 转换和持久化

应用 E2E 测试
  → Fastify + NestJS + PostgreSQL
  → 验证 HTTP 到数据库的完整链路
```
