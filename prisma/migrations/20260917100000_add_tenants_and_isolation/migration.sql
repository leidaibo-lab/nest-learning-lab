-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_members" (
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("tenant_id", "user_id")
);

-- AddColumn
ALTER TABLE "projects" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "task_events" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "notification_jobs" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "tenant_id" UUID;

-- Existing users and projects are placed into one default tenant per user.
CREATE TEMP TABLE "tenant_backfill" (
    "user_id" UUID NOT NULL PRIMARY KEY,
    "tenant_id" UUID NOT NULL
) ON COMMIT DROP;

INSERT INTO "tenant_backfill" ("user_id", "tenant_id")
SELECT "id", gen_random_uuid()
FROM "users";

INSERT INTO "tenants" ("id", "name")
SELECT "tenant_id", '默认组织'
FROM "tenant_backfill";

INSERT INTO "tenant_members" ("tenant_id", "user_id", "role")
SELECT "tenant_id", "user_id", 'owner'
FROM "tenant_backfill";

UPDATE "projects" AS project
SET "tenant_id" = backfill."tenant_id"
FROM "tenant_backfill" AS backfill
WHERE project."owner_id" = backfill."user_id";

INSERT INTO "tenant_members" ("tenant_id", "user_id", "role")
SELECT project."tenant_id", member."user_id", member."role"
FROM "project_members" AS member
JOIN "projects" AS project ON project."id" = member."project_id"
ON CONFLICT ("tenant_id", "user_id") DO NOTHING;

UPDATE "task_events" AS event
SET "tenant_id" = project."tenant_id"
FROM "tasks" AS task
JOIN "projects" AS project ON project."id" = task."project_id"
WHERE event."taskId" = task."id";

UPDATE "notification_jobs" AS job
SET "tenant_id" = event."tenant_id"
FROM "task_events" AS event
WHERE job."event_id" = event."id";

UPDATE "notifications" AS notification
SET "tenant_id" = event."tenant_id"
FROM "task_events" AS event
WHERE notification."task_event_id" = event."id";

ALTER TABLE "projects" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "task_events" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notification_jobs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tenants_created_at_idx" ON "tenants"("created_at");
CREATE INDEX "tenant_members_user_id_idx" ON "tenant_members"("user_id");
CREATE INDEX "projects_tenant_id_created_at_idx" ON "projects"("tenant_id", "created_at");
CREATE UNIQUE INDEX "projects_tenant_id_id_key" ON "projects"("tenant_id", "id");
CREATE INDEX "task_events_tenant_id_created_at_idx" ON "task_events"("tenant_id", "created_at");
CREATE INDEX "notification_jobs_tenant_id_status_available_at_idx" ON "notification_jobs"("tenant_id", "status", "available_at");
CREATE INDEX "notifications_tenant_id_user_id_created_at_idx" ON "notifications"("tenant_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
