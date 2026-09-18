import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './observability/http-exception.filter';
import { RequestLoggingInterceptor } from './observability/request-logging.interceptor';
import { NotificationsModule } from './notifications/notifications.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
            limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
          },
        ],
        setHeaders: true,
      }),
    }),
    DatabaseModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    HealthModule,
    NotificationsModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 通过全局 Provider 统一接入横切能力，确保 bootstrap 和测试装配行为一致。
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    // Guard 在 Controller 和 Service 前执行，让超限请求不会进入业务逻辑或数据库。
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
