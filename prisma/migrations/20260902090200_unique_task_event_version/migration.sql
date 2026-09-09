-- CreateIndex
CREATE UNIQUE INDEX "task_events_taskId_version_key" ON "task_events"("taskId", "version");
