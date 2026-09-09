import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTaskStatusDto } from './update-task-status.dto';

describe('UpdateTaskStatusDto', () => {
  it('converts the expected version to a number', async () => {
    const dto = plainToInstance(UpdateTaskStatusDto, {
      status: 'in_progress',
      expectedVersion: '1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.expectedVersion).toBe(1);
  });

  it.each([
    {},
    { status: 'unknown', expectedVersion: 1 },
    { status: 'done', expectedVersion: 0 },
    { status: 'done', expectedVersion: 'not-a-number' },
  ])('rejects invalid input: %p', async (input) => {
    const dto = plainToInstance(UpdateTaskStatusDto, input);

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
