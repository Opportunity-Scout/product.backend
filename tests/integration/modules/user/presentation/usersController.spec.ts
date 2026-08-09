import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@app/AppModule';
import { configureApp } from '@app/configureApp';
import { loginAsNewUser } from '../../../helpers/loginAsNewUserHelper';
import { promoteToAdmin } from '../../../helpers/promoteToAdminHelper';

describe('UsersController (integration)', () => {
  let app: NestExpressApplication;
  let verificationClient: PrismaClient;
  const createdUserIds: string[] = [];

  async function login(): Promise<{ token: string; userId: string }> {
    const { token, userId } = await loginAsNewUser(app, verificationClient);
    createdUserIds.push(userId);

    return { token, userId };
  }

  function authHeader(token: string): string {
    return `Bearer ${token}`;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    verificationClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await verificationClient.user.delete({ where: { id } });
    }

    await verificationClient.$disconnect();
    await app.close();
  });

  describe('PATCH /users/:id/search-profile-limit', () => {
    it('returns 401 with no bearer token', async () => {
      const { userId } = await login();

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}/search-profile-limit`)
        .send({ limit: 3 });

      expect(response.status).toBe(401);
    });

    it('returns 403 when the caller is not an admin', async () => {
      const caller = await login();
      const target = await login();

      const response = await request(app.getHttpServer())
        .patch(`/users/${target.userId}/search-profile-limit`)
        .set('Authorization', `Bearer ${caller.token}`)
        .send({ limit: 3 });

      expect(response.status).toBe(403);
    });

    it('updates the limit when the caller is an admin', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);
      const target = await login();

      const response = await request(app.getHttpServer())
        .patch(`/users/${target.userId}/search-profile-limit`)
        .set('Authorization', authHeader(admin.token))
        .send({ limit: 3 });

      const persisted = await verificationClient.user.findUnique({ where: { id: target.userId } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: target.userId, searchProfileLimit: 3 });
      expect(persisted?.searchProfileLimit).toBe(3);
    });

    it('returns 404 when no user exists for the id', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const response = await request(app.getHttpServer())
        .patch('/users/00000000-0000-0000-0000-000000000000/search-profile-limit')
        .set('Authorization', authHeader(admin.token))
        .send({ limit: 3 });

      expect(response.status).toBe(404);
    });

    it('returns 400 when the limit is negative', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);
      const target = await login();

      const response = await request(app.getHttpServer())
        .patch(`/users/${target.userId}/search-profile-limit`)
        .set('Authorization', authHeader(admin.token))
        .send({ limit: -1 });

      expect(response.status).toBe(400);
    });
  });
});
