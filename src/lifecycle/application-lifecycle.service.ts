import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationLifecycleService implements BeforeApplicationShutdown {
  private draining = false;
  private shutdownSignal?: string;

  beforeApplicationShutdown(signal?: string): void {
    // 先标记停止接流量，再让各模块结束当前工作；这给探针和后台任务同一个事实来源。
    // 这里不等待固定时长：终止宽限期属于部署环境约束，必须结合任务耗时分位数和故障演练校准。
    this.draining = true;
    this.shutdownSignal = signal;
  }

  isDraining(): boolean {
    return this.draining;
  }

  getShutdownSignal(): string | undefined {
    return this.shutdownSignal;
  }
}
