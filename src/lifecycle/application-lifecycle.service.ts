import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationLifecycleService implements BeforeApplicationShutdown {
  private draining = false;
  private shutdownSignal?: string;

  beforeApplicationShutdown(signal?: string): void {
    // 先标记停止接流量，再让各模块结束当前工作；这给探针和后台任务同一个事实来源。
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
