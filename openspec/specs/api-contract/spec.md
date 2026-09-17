# api-contract Specification

## Purpose

定义任务管理 API 的 OpenAPI 文档入口和主要 HTTP 契约元数据。

## Requirements

### Requirement: 提供 OpenAPI 文档入口

系统 MUST 提供 `GET /docs` Swagger UI 和 `GET /docs-json` OpenAPI JSON；文档 MUST 使用当前 Fastify 应用注册的路由生成，并包含认证、项目、任务、通知和健康接口路径。

#### Scenario: 浏览 Swagger UI

- **WHEN** 客户端访问 `GET /docs`
- **THEN** 系统返回 HTTP 200 的 Swagger UI 页面

#### Scenario: 获取 OpenAPI JSON

- **WHEN** 客户端访问 `GET /docs-json`
- **THEN** 系统返回 HTTP 200 的 OpenAPI 文档，包含 `/auth/register`、`/auth/login`、`/tasks`、`/notifications` 和 `/health` 路径

### Requirement: 描述主要 HTTP 契约

系统 MUST 为认证、项目、任务、通知和健康 Controller 提供可生成的标签、操作摘要、请求体或路径参数及主要响应状态元数据；任务和项目接口 MUST 声明 Bearer 认证要求。

#### Scenario: 文档声明任务认证

- **WHEN** 客户端读取 `/tasks` 的 OpenAPI operation
- **THEN** 文档包含 Bearer security requirement、请求体 schema 以及 201、400、401 或 403 响应
