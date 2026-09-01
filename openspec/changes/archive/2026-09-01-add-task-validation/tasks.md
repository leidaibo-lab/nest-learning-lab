## 1. 请求校验实现

- [x] 1.1 为 CreateTaskDto 增加字符串、非空和长度校验
- [x] 1.2 在 main.ts 注册全局 ValidationPipe 并配置转换、白名单和未知字段拒绝
- [x] 1.3 移除 TasksService 中与 DTO 重复的输入类型检查

## 2. 测试请求生命周期

- [x] 2.1 增加 DTO 校验的单元测试
- [x] 2.2 增加合法、非法和未知字段的 Fastify E2E 测试

## 3. 验证与沉淀

- [x] 3.1 更新规格回顾并运行 OpenSpec、lint、单元测试、E2E 测试和构建
- [x] 3.2 通过 git diff 检索关键变更并归档
