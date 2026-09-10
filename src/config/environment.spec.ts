import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it.each([{}, { DATABASE_URL: '' }, { DATABASE_URL: 'not-a-url' }])(
    'rejects invalid database configuration: %p',
    (environment) => {
      expect(() => validateEnvironment(environment)).toThrow();
    },
  );

  it('accepts a PostgreSQL connection URL', () => {
    const databaseUrl =
      'postgresql://nest:nest@localhost:5433/nest_learning_lab';

    expect(
      validateEnvironment({
        DATABASE_URL: databaseUrl,
        JWT_SECRET: 'local-development-secret-change-before-production-2026',
        JWT_ISSUER: 'nest-learning-lab',
        JWT_AUDIENCE: 'task-api',
        JWT_ACCESS_TOKEN_TTL: '15m',
      }),
    ).toEqual({
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'local-development-secret-change-before-production-2026',
      JWT_ISSUER: 'nest-learning-lab',
      JWT_AUDIENCE: 'task-api',
      JWT_ACCESS_TOKEN_TTL: '15m',
    });
  });
});
