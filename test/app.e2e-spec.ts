import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { Task } from './../src/tasks/task';

describe('Application (e2e)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let projectId: string;

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
    const suffix = randomUUID();
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `owner-${suffix}@example.com`,
        password: 'password123',
      },
    });
    accessToken = registerResponse.json<{ accessToken: string }>().accessToken;
    const projectResponse = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'Learning project' },
    });
    projectId = projectResponse.json<{ id: string }>().id;
  });

  it('/ (GET)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe('Hello World!');
  });

  it('rejects an unauthenticated task request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: { projectId, title: 'Should require authentication' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('logs in with registered credentials', async () => {
    const email = `login-${randomUUID()}@example.com`;
    const password = 'password123';
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({ accessToken: expect.any(String) as string }),
    );
  });

  it('creates and retrieves a task', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId, title: '  Learn NestJS modules  ' },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<Task>();
    expect(created).toEqual({
      id: expect.any(String) as string,
      title: 'Learn NestJS modules',
      status: 'todo',
      version: 1,
      projectId,
      createdAt: expect.any(String) as string,
    });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json<Task>()).toEqual(created);
  });

  it('rejects a missing task title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId },
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
      headers: { authorization: `Bearer ${accessToken}` },
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
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('retrieves a task after recreating the application', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId, title: 'Persist across application instances' },
    });
    const created = createResponse.json<Task>();

    await app.close();
    app = await createApplication();

    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<Task>()).toEqual(created);
  });

  it('updates a task status with the expected version', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId, title: 'Practice status transitions' },
    });
    const created = createResponse.json<Task>();

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/tasks/${created.id}/status`,
      headers: { authorization: `Bearer ${accessToken}` },
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
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId, title: 'Practice optimistic locking' },
    });
    const created = createResponse.json<Task>();

    const responses = await Promise.all(
      ['in_progress', 'done'].map((status) =>
        app.inject({
          method: 'PATCH',
          url: `/tasks/${created.id}/status`,
          headers: { authorization: `Bearer ${accessToken}` },
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

  it('blocks a non-member from reading a project task', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { projectId, title: 'Private project task' },
    });
    const created = createResponse.json<Task>();
    const outsiderEmail = `outsider-${randomUUID()}@example.com`;
    const outsiderResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: outsiderEmail, password: 'password123' },
    });
    const outsiderToken = outsiderResponse.json<{ accessToken: string }>()
      .accessToken;

    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
      headers: { authorization: `Bearer ${outsiderToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('allows an invited member to read tasks but not invite others', async () => {
    const memberEmail = `member-${randomUUID()}@example.com`;
    const memberRegistration = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: memberEmail, password: 'password123' },
    });
    const memberToken = memberRegistration.json<{ accessToken: string }>()
      .accessToken;
    const inviteResponse = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { email: memberEmail },
    });
    expect(inviteResponse.statusCode).toBe(201);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { projectId, title: 'Member can read this task' },
    });
    expect(createResponse.statusCode).toBe(201);

    const forbiddenInvite = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { email: `another-${randomUUID()}@example.com` },
    });
    expect(forbiddenInvite.statusCode).toBe(403);
  });

  afterEach(async () => {
    await app.close();
  });
});
