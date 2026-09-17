import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.getOrThrow<string>('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    // Prisma 在应用开始接收请求前建立连接；启动失败会让容器直接退出，交给编排器重启。
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    // Nest 关闭应用时调用此钩子，确保连接池在进程退出前释放完毕。
    await this.$disconnect();
  }
}
