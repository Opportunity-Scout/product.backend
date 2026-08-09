import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

// Called from main.ts and every integration spec, so the two can't drift apart.
export function configureApp(app: NestExpressApplication): void {
  // Caddy is the only reverse proxy in front of this app — trust exactly one hop.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({ origin: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
