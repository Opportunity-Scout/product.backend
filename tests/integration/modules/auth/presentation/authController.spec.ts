import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '@app/AppModule';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { signTelegramLoginPayload } from '../../../../helpers/signTelegramLoginPayloadHelper';

describe('POST /auth/telegram (integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prismaService = moduleRef.get(PrismaService, { strict: false });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prismaService.user.delete({ where: { id } });
    }

    await app.close();
  });

  it('returns a token and creates a user in Postgres for a validly signed payload', async () => {
    const payload = signTelegramLoginPayload(
      { id: 'integration-telegram-1', username: 'oleg', auth_date: Math.floor(Date.now() / 1000) },
      process.env.TELEGRAM_BOT_TOKEN as string,
    );

    const response = await request(app.getHttpServer() as Server)
      .post('/auth/telegram')
      .send(payload);

    const body = response.body as { token: string };
    const createdUser = await prismaService.user.findUnique({ where: { telegramUserId: 'integration-telegram-1' } });

    if (createdUser) {
      createdUserIds.push(createdUser.id);
    }

    expect(response.status).toBe(200);
    expect(typeof body.token).toBe('string');
    expect(createdUser).not.toBeNull();
    expect(createdUser?.telegramUsername).toBe('oleg');
  });

  it('returns 401 for an invalid signature', async () => {
    const payload = signTelegramLoginPayload(
      { id: 'integration-telegram-2', auth_date: Math.floor(Date.now() / 1000) },
      'a-different-bot-token',
    );

    const response = await request(app.getHttpServer() as Server)
      .post('/auth/telegram')
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('returns 401 for a payload that is too old', async () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;

    const payload = signTelegramLoginPayload(
      { id: 'integration-telegram-3', auth_date: twoDaysAgo },
      process.env.TELEGRAM_BOT_TOKEN as string,
    );

    const response = await request(app.getHttpServer() as Server)
      .post('/auth/telegram')
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/auth/telegram')
      .send({ id: '12345' });

    expect(response.status).toBe(400);
  });
});
