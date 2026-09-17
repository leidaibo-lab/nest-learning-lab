#!/bin/sh
set -eu

# 迁移是发布前置步骤：只有数据库结构就绪后，Nest 进程才开始接收流量。
pnpm prisma:migrate:deploy
exec node dist/main.js
