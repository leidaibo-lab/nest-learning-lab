-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id", "user_id")
);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "project_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");
CREATE INDEX "tasks_project_id_created_at_idx" ON "tasks"("project_id", "created_at");

-- Preserve tasks created before project ownership by placing them in a local migration project.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "tasks") THEN
        INSERT INTO "users" ("id", "email", "password_hash")
        VALUES ('00000000-0000-4000-8000-000000000001', 'legacy-owner@local.invalid', 'migration-managed-account')
        ON CONFLICT ("id") DO NOTHING;

        INSERT INTO "projects" ("id", "name", "owner_id")
        VALUES ('00000000-0000-4000-8000-000000000002', 'Legacy tasks', '00000000-0000-4000-8000-000000000001')
        ON CONFLICT ("id") DO NOTHING;

        INSERT INTO "project_members" ("project_id", "user_id", "role")
        VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'owner')
        ON CONFLICT ("project_id", "user_id") DO NOTHING;

        UPDATE "tasks"
        SET "project_id" = '00000000-0000-4000-8000-000000000002'
        WHERE "project_id" IS NULL;
    END IF;
END $$;

ALTER TABLE "tasks" ALTER COLUMN "project_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
