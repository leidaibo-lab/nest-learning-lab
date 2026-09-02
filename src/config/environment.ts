interface Environment {
  DATABASE_URL: string;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Environment {
  const databaseUrl = environment.DATABASE_URL;

  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL 环境变量不能为空');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL 必须是有效的 PostgreSQL 连接地址');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL 必须使用 postgresql:// 或 postgres://');
  }

  return {
    DATABASE_URL: databaseUrl,
  };
}
