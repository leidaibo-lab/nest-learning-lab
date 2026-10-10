-- AddColumn
ALTER TABLE "notification_jobs" ADD COLUMN "lease_until" TIMESTAMPTZ(3);

-- A separate index keeps pending scans and expired processing scans selective.
CREATE INDEX "notification_jobs_status_lease_until_idx"
ON "notification_jobs"("status", "lease_until");
