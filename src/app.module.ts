import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestDemoController } from './test-demo/test-demo.controller';

@Module({
  imports: [],
  controllers: [AppController, TestDemoController],
  providers: [AppService],
})
export class AppModule {}
