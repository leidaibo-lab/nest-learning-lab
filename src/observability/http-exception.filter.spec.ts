import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { RequestWithId } from './request-context';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  type MockReply = {
    header: jest.Mock;
    status: jest.Mock;
    send: jest.Mock;
  };

  let filter: HttpExceptionFilter;
  let request: RequestWithId;
  let response: MockReply;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    request = { requestId: 'trace-123' } as RequestWithId;
    response = {
      header: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  });

  it('保留 HTTP 异常字段并补充请求标识', () => {
    filter.catch(new BadRequestException('输入无效'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: '输入无效',
      error: 'Bad Request',
      requestId: 'trace-123',
    });
  });

  it('隐藏未知异常的内部消息', () => {
    filter.catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.send).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      requestId: 'trace-123',
    });
  });
});
