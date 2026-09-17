import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  // 开启关闭钩子后，容器收到 SIGTERM 会依次触发 Provider 的销毁逻辑。
  // 这让通知处理器可以先完成当前数据库操作，Prisma 再安全断开连接。
  app.enableShutdownHooks();
  // ValidationPipe 在 Controller 执行前校验 DTO，并清理或拒绝未声明字段。
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  // 监听端口放在所有启动配置完成之后，避免容器过早接收尚未准备好的请求。
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
