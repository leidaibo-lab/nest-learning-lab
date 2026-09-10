interface Environment {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_TOKEN_TTL: string;
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

  const jwtSecret = environment.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.trim().length < 32) {
    throw new Error('JWT_SECRET 至少需要 32 个字符');
  }

  const jwtIssuer = environment.JWT_ISSUER;
  if (typeof jwtIssuer !== 'string' || jwtIssuer.trim() === '') {
    throw new Error('JWT_ISSUER 环境变量不能为空');
  }

  const jwtAudience = environment.JWT_AUDIENCE;
  if (typeof jwtAudience !== 'string' || jwtAudience.trim() === '') {
    throw new Error('JWT_AUDIENCE 环境变量不能为空');
  }

  const jwtAccessTokenTtl = environment.JWT_ACCESS_TOKEN_TTL;
  if (
    typeof jwtAccessTokenTtl !== 'string' ||
    !/^([1-9][0-9]*)([smhd])$/.test(jwtAccessTokenTtl)
  ) {
    throw new Error('JWT_ACCESS_TOKEN_TTL 必须是例如 15m、1h 的时长');
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_ISSUER: jwtIssuer,
    JWT_AUDIENCE: jwtAudience,
    JWT_ACCESS_TOKEN_TTL: jwtAccessTokenTtl,
  };
}
