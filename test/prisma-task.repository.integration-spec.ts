import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaTaskRepository } from '../src/tasks/prisma-task.repository';
import { Task } from '../src/tasks/task';

describe('PrismaTaskRepository (integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let repository: PrismaTaskRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnvironment,
        }),
        DatabaseModule,
      ],
      providers: [PrismaTaskRepository],
    }).compile();

    await module.init();
    prisma = module.get(PrismaService);
    repository = module.get(PrismaTaskRepository);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  it('persists and retrieves a task', async () => {
    const task: Task = {
      id: randomUUID(),
      title: 'Learn Prisma repository',
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    await expect(repository.save(task)).resolves.toEqual(task);
    await expect(repository.findById(task.id)).resolves.toEqual(task);
  });

  it('returns undefined for an unknown task', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeUndefined();
  });

  afterAll(async () => {
    await module.close();
  });
});
