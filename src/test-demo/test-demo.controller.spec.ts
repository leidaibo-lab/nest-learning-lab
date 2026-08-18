import { Test, TestingModule } from '@nestjs/testing';
import { TestDemoController } from './test-demo.controller';

describe('TestDemoController', () => {
  let controller: TestDemoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestDemoController],
    }).compile();

    controller = module.get<TestDemoController>(TestDemoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
