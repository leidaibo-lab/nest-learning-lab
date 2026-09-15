import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { RequestWithId } from './request-context';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  type MockReply = {
    header: jest.Mock;
    statusCode: number;
  };

  let interceptor: RequestLoggingInterceptor;
  let request: RequestWithId;
  let response: MockReply;
  let context: ExecutionContext;
  let loggerSpy: jest.SpiedFunction<Logger['log']>;

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor();
    request = {
      headers: {},
      method: 'GET',
      url: '/health',
    } as RequestWithId;
    response = {
      header: jest.fn().mockReturnThis(),
      statusCode: 200,
    };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('透传合法请求标识并记录成功请求', async () => {
    const next: CallHandler = { handle: () => of('ok') };
    request.headers['x-request-id'] = 'trace-123';

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe('ok');

    expect(request.requestId).toBe('trace-123');
    expect(response.header).toHaveBeenCalledWith('x-request-id', 'trace-123');
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"http.request"'),
      'HTTP',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":200'),
      'HTTP',
    );
  });

  it('为非法请求标识生成新的标识', () => {
    const next: CallHandler = { handle: () => of('ok') };
    request.headers['x-request-id'] = 'invalid request id';

    interceptor.intercept(context, next);

    expect(request.requestId).toEqual(expect.any(String) as string);
    expect(request.requestId).not.toBe('invalid request id');
  });

  it('记录异常请求并继续抛出原异常', async () => {
    const exception = new BadRequestException('invalid input');
    const next: CallHandler = {
      handle: () => throwError(() => exception),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(exception);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"statusCode":400'),
      'HTTP',
    );
  });
});
