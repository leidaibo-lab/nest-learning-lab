-- 租约令牌用于围栏不同处理尝试，避免过期实例覆盖新实例的终态。
ALTER TABLE "notification_jobs"
ADD COLUMN "lease_token" UUID;
