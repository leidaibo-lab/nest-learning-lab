import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { RequestWithId } from './request-context';

type ErrorPayload = Record<string, unknown>;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<FastifyReply>();
    const request = http.getRequest<RequestWithId>();
    // 业务异常保留原有响应内容；未知异常只暴露通用信息，避免泄露内部细节。
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = this.toErrorPayload(exceptionResponse);
    const requestId = request.requestId ?? randomUUID();

    // Interceptor 通常已设置响应头；这里再次设置可覆盖异常发生前的响应流程。
    response
      .header('x-request-id', requestId)
      .status(statusCode)
      .send({
        ...details,
        statusCode,
        message: details.message ?? this.defaultMessage(statusCode),
        error: details.error ?? this.defaultError(statusCode),
        requestId,
      });
  }

  private toErrorPayload(response: string | object | undefined): ErrorPayload {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (response && !Array.isArray(response)) {
      return response as ErrorPayload;
    }

    return {};
  }

  private defaultMessage(statusCode: number): string {
    return statusCode >= 500 ? 'Internal server error' : 'Request failed';
  }

  private defaultError(statusCode: number): string {
    return statusCode >= 500 ? 'Internal Server Error' : 'Request Error';
  }
}
