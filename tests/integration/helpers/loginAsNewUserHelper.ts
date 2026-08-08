import { Server } from 'http';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { signTelegramLoginPayload } from '../../helpers/signTelegramLoginPayloadHelper';

export async function loginAsNewUser(
  app: INestApplication,
  verificationClient: PrismaClient,
): Promise<{ token: string; userId: string }> {
  const telegramUserId = `integration-test-user-${randomUUID()}`;
  const payload = signTelegramLoginPayload(
    { id: telegramUserId, auth_date: Math.floor(Date.now() / 1000) },
    process.env.TELEGRAM_BOT_TOKEN as string,
  );

  const response = await request(app.getHttpServer() as Server)
    .post('/auth/telegram')
    .send(payload);
  const body = response.body as { token: string };
  const user = await verificationClient.user.findUniqueOrThrow({ where: { telegramUserId } });

  return { token: body.token, userId: user.id };
}
