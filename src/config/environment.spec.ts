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

    expect(validateEnvironment({ DATABASE_URL: databaseUrl })).toEqual({
      DATABASE_URL: databaseUrl,
    });
  });
});
