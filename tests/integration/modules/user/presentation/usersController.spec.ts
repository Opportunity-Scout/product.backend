import { randomUUID } from 'crypto';
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

  describe('GET /users', () => {
    it('returns 401 with no bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/users');

      expect(response.status).toBe(401);
    });

    it('returns 403 when the caller is not an admin', async () => {
      const { token } = await login();
      const response = await request(app.getHttpServer()).get('/users').set('Authorization', authHeader(token));

      expect(response.status).toBe(403);
    });

    it('returns a paginated, search-filtered page of users for an admin caller', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);
      const searchTerm = `int-test-${randomUUID()}`;
      const first = await login();
      const second = await login();

      await verificationClient.user.update({
        where: { id: first.userId },
        data: { telegramUsername: `${searchTerm}-a` },
      });

      await verificationClient.user.update({
        where: { id: second.userId },
        data: { telegramUsername: `${searchTerm}-b` },
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ telegramUsername: searchTerm, limit: 1, offset: 0 })
        .set('Authorization', authHeader(admin.token));

      const body = response.body as { total: number; limit: number; offset: number; users: unknown[] };

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ total: 2, limit: 1, offset: 0 });
      expect(body.users).toHaveLength(1);
    });
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

  describe('DELETE /users/:id', () => {
    it('returns 401 with no bearer token', async () => {
      const { userId } = await login();
      const response = await request(app.getHttpServer()).delete(`/users/${userId}`);

      expect(response.status).toBe(401);
    });

    it('returns 404 when the caller does not own the account', async () => {
      const caller = await login();
      const target = await login();

      const response = await request(app.getHttpServer())
        .delete(`/users/${target.userId}`)
        .set('Authorization', authHeader(caller.token));

      expect(response.status).toBe(404);
      expect(await verificationClient.user.findUnique({ where: { id: target.userId } })).not.toBeNull();
    });

    it('deletes the account and cascades to its search profiles when the caller owns it', async () => {
      const { token, userId } = await login();

      const createProfileResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', authHeader(token))
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      const profileId = (createProfileResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', authHeader(token));

      // Already deleted — afterAll's cleanup loop must not try again.
      createdUserIds.splice(createdUserIds.indexOf(userId), 1);

      expect(response.status).toBe(204);
      expect(await verificationClient.user.findUnique({ where: { id: userId } })).toBeNull();
      expect(await verificationClient.searchProfile.findUnique({ where: { id: profileId } })).toBeNull();
    });

    it('lets an admin caller delete another account', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);
      const { userId: targetId } = await login();

      const response = await request(app.getHttpServer())
        .delete(`/users/${targetId}`)
        .set('Authorization', authHeader(admin.token));

      createdUserIds.splice(createdUserIds.indexOf(targetId), 1);

      expect(response.status).toBe(204);
      expect(await verificationClient.user.findUnique({ where: { id: targetId } })).toBeNull();
    });
  });
});
