import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

describe('CreateTaskDto', () => {
  it('trims a valid title before validation', async () => {
    const dto = plainToInstance(CreateTaskDto, { title: '  Learn NestJS  ' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe('Learn NestJS');
  });

  it.each([{}, { title: '   ' }, { title: 42 }, { title: 'a'.repeat(121) }])(
    'rejects invalid input: %p',
    async (input) => {
      const dto = plainToInstance(CreateTaskDto, input);

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );
});
