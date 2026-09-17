import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(
  app: INestApplication,
  options: { ui?: boolean } = {},
): void {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Nest Learning Lab Task API')
    .setDescription('任务管理学习实验室的 HTTP 接口契约')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  // Swagger 从 Controller/DTO 元数据生成契约，JSON 地址可供客户端生成代码或 CI 检查使用。
  SwaggerModule.setup('docs', app, openApiDocument, {
    ui: options.ui ?? true,
    jsonDocumentUrl: 'docs-json',
  });
}
