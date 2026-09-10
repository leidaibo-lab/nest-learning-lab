import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('@nestjs/jwt configuration', () => {
  let module: TestingModule;
  let service: JwtService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'a'.repeat(32),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: '15m',
            issuer: 'nest-learning-lab',
            audience: 'task-api',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'nest-learning-lab',
            audience: 'task-api',
          },
        }),
      ],
    }).compile();
    service = module.get(JwtService);
  });

  it('signs a short-lived token with a subject', () => {
    const token = service.sign({}, { subject: 'user-1' });
    const claims = service.verify<{ sub: string }>(token);

    expect(claims.sub).toBe('user-1');
    expect(claims.exp! - claims.iat!).toBe(15 * 60);
  });

  it('rejects a token with an unexpected audience', () => {
    const token = service.sign(
      {},
      { subject: 'user-1', audience: 'other-api' },
    );

    expect(() => service.verify<Record<string, unknown>>(token)).toThrow();
  });

  afterAll(async () => {
    await module.close();
  });
});
