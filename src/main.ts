import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import './registerPaths';
import { AppModule } from './AppModule';
import { configureApp } from './configureApp';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Product Backend API')
    .setDescription('BeFirst Platform — Backend Skeleton API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('product-backend-api/swagger', app, swaggerDocument, {
    swaggerOptions: { tagsSorter: 'alpha' },
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

void bootstrap();
