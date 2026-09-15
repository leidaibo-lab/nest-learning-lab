import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { RequestWithId } from './request-context';

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<FastifyReply>();
    // 请求 ID 会同时写入请求上下文和响应头，便于客户端与服务端关联同一次请求。
    const requestId = this.resolveRequestId(request.headers['x-request-id']);
    const startedAt = Date.now();

    request.requestId = requestId;
    response.header('x-request-id', requestId);

    const log = (statusCode: number): void => {
      this.logger.log(
        JSON.stringify({
          event: 'http.request',
          requestId,
          method: request.method,
          path: request.url,
          statusCode,
          durationMs: Date.now() - startedAt,
        }),
        'HTTP',
      );
    };

    // tap 处理成功响应，catchError 处理异常响应；异常会继续向 Filter 传播。
    return next.handle().pipe(
      tap(() => log(response.statusCode)),
      catchError((exception: unknown) => {
        log(exception instanceof HttpException ? exception.getStatus() : 500);
        return throwError(() => exception);
      }),
    );
  }

  private resolveRequestId(header: string | string[] | undefined): string {
    if (typeof header === 'string' && requestIdPattern.test(header)) {
      return header;
    }

    return randomUUID();
  }
}
