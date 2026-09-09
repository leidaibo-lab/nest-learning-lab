import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { Task } from './../src/tasks/task';

describe('Application (e2e)', () => {
  let app: NestFastifyApplication;

  async function createApplication(): Promise<NestFastifyApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const application =
      moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
    application.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await application.init();
    return application;
  }

  beforeEach(async () => {
    app = await createApplication();
    await app.get(PrismaService).task.deleteMany();
  });

  it('/ (GET)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe('Hello World!');
  });

  it('creates and retrieves a task', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { title: '  Learn NestJS modules  ' },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<Task>();
    expect(created).toEqual({
      id: expect.any(String) as string,
      title: 'Learn NestJS modules',
      status: 'todo',
      version: 1,
      createdAt: expect.any(String) as string,
    });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json<Task>()).toEqual(created);
  });

  it('rejects a missing task title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([
    { title: '   ' },
    { title: 42 },
    { title: 'a'.repeat(121) },
    { title: 'Valid title', unexpected: true },
  ])('rejects invalid task payload: %p', async (payload) => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: expect.any(Array) as unknown[],
        error: 'Bad Request',
      }),
    );
  });

  it('returns 404 for an unknown task', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('retrieves a task after recreating the application', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { title: 'Persist across application instances' },
    });
    const created = createResponse.json<Task>();

    await app.close();
    app = await createApplication();

    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<Task>()).toEqual(created);
  });

  it('updates a task status with the expected version', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { title: 'Practice status transitions' },
    });
    const created = createResponse.json<Task>();

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/tasks/${created.id}/status`,
      payload: { status: 'in_progress', expectedVersion: created.version },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json<Task>()).toEqual({
      ...created,
      status: 'in_progress',
      version: 2,
    });
  });

  it('returns 409 when two updates use the same version', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { title: 'Practice optimistic locking' },
    });
    const created = createResponse.json<Task>();

    const responses = await Promise.all(
      ['in_progress', 'done'].map((status) =>
        app.inject({
          method: 'PATCH',
          url: `/tasks/${created.id}/status`,
          payload: { status, expectedVersion: created.version },
        }),
      ),
    );

    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      200, 409,
    ]);
    expect(
      responses.filter((response) => response.statusCode === 200),
    ).toHaveLength(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
