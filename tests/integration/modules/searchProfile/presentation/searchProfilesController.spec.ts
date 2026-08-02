import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@app/AppModule';

describe('POST /search-profiles (integration)', () => {
  let app: INestApplication;
  let verificationClient: PrismaClient;
  let createdSearchProfileId: string | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    verificationClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  });

  afterAll(async () => {
    if (createdSearchProfileId) {
      await verificationClient.searchProfile.delete({ where: { id: createdSearchProfileId } });
    }

    await verificationClient.$disconnect();
    await app.close();
  });

  it('persists the created search profile in Postgres', async () => {
    const payload = {
      userId: 'integration-user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true } },
    };

    const response = await request(app.getHttpServer() as Server)
      .post('/search-profiles')
      .send(payload);

    const body = response.body as { id: string };
    createdSearchProfileId = body.id;
    const persisted = await verificationClient.searchProfile.findUnique({ where: { id: body.id } });

    expect(response.status).toBe(201);
    expect(persisted).not.toBeNull();
    expect(persisted?.userId).toBe(payload.userId);
    expect(persisted?.name).toBe(payload.name);
  });
});
