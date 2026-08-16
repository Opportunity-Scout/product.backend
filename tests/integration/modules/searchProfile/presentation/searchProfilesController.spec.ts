import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@app/AppModule';
import { configureApp } from '@app/configureApp';
import { loginAsNewUser } from '../../../helpers/loginAsNewUserHelper';
import { promoteToAdmin } from '../../../helpers/promoteToAdminHelper';

describe('SearchProfilesController (integration)', () => {
  let app: NestExpressApplication;
  let verificationClient: PrismaClient;
  const createdSearchProfileIds: string[] = [];
  const createdUserIds: string[] = [];

  async function login(): Promise<{ token: string; userId: string }> {
    const { token, userId } = await loginAsNewUser(app, verificationClient);
    createdUserIds.push(userId);

    return { token, userId };
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
    for (const id of createdSearchProfileIds) {
      await verificationClient.searchProfile.delete({ where: { id } });
    }

    for (const id of createdUserIds) {
      await verificationClient.user.delete({ where: { id } });
    }

    await verificationClient.$disconnect();
    await app.close();
  });

  describe('authentication', () => {
    it('returns 401 for POST /search-profiles with no bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post('/search-profiles')
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      expect(response.status).toBe(401);
    });

    it('returns 401 for GET /search-profiles with no bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/search-profiles');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /search-profiles', () => {
    it('persists the created search profile in Postgres, owned by the authenticated user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token, userId } = await login();

      const response = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const body = response.body as { id: string };
      createdSearchProfileIds.push(body.id);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: body.id } });

      expect(response.status).toBe(201);
      expect(persisted).not.toBeNull();
      expect(persisted?.userId).toBe(userId);
      expect(persisted?.name).toBe(payload.name);
    });
  });

  describe('POST /search-profiles/admin', () => {
    it('returns 401 with no bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post('/search-profiles/admin')
        .send({ userId: '00000000-0000-0000-0000-000000000000', name: 'Backend Prague' });

      expect(response.status).toBe(401);
    });

    it('returns 403 when the caller is not an admin', async () => {
      const { token, userId } = await login();

      const response = await request(app.getHttpServer())
        .post('/search-profiles/admin')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId, name: 'Backend Prague', preferences: { location: { remote: true } } });

      expect(response.status).toBe(403);
    });

    it('creates a search profile on behalf of the given user for an admin caller', async () => {
      const target = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const response = await request(app.getHttpServer())
        .post('/search-profiles/admin')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ userId: target.userId, name: 'Backend Prague', preferences: { location: { remote: true } } });

      const body = response.body as { id: string };
      createdSearchProfileIds.push(body.id);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: body.id } });

      expect(response.status).toBe(201);
      expect(persisted?.userId).toBe(target.userId);
    });

    it('returns 404 when the target userId does not exist', async () => {
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const response = await request(app.getHttpServer())
        .post('/search-profiles/admin')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          userId: '00000000-0000-0000-0000-000000000000',
          name: 'Backend Prague',
          preferences: { location: { remote: true } },
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /search-profiles/:id', () => {
    it('returns the search profile when it exists', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token, userId } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .get(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, userId, name: payload.name });
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .get('/search-profiles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .get('/search-profiles/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .get(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect(response.status).toBe(404);
    });

    it('lets an admin caller read a search profile that belongs to someone else', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .get(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, userId: owner.userId });
    });
  });

  describe('DELETE /search-profiles/:id', () => {
    it('returns 401 with no bearer token', async () => {
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer()).delete(`/search-profiles/${createdId}`);

      expect(response.status).toBe(401);
    });

    it('deletes the search profile when the caller owns it', async () => {
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      const createdId = (createResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .delete(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
      expect(await verificationClient.searchProfile.findUnique({ where: { id: createdId } })).toBeNull();
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .delete(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect(response.status).toBe(404);
      expect(await verificationClient.searchProfile.findUnique({ where: { id: createdId } })).not.toBeNull();
    });

    it('lets an admin caller delete a search profile that belongs to someone else', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .delete(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(response.status).toBe(204);
      expect(await verificationClient.searchProfile.findUnique({ where: { id: createdId } })).toBeNull();
    });
  });

  describe('GET /search-profiles/admin', () => {
    it('returns 401 with no bearer token', async () => {
      const response = await request(app.getHttpServer()).get('/search-profiles/admin');

      expect(response.status).toBe(401);
    });

    it('returns 403 when the caller is not an admin', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .get('/search-profiles/admin')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('returns a paginated page of search profiles filtered by userId for an admin caller', async () => {
      const owner = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);
      await request(app.getHttpServer())
        .patch(`/users/${owner.userId}/search-profile-limit`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ limit: 2 });

      const firstResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      const secondResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Frontend Berlin', preferences: { location: { remote: true } } });

      createdSearchProfileIds.push(
        (firstResponse.body as { id: string }).id,
        (secondResponse.body as { id: string }).id,
      );

      const response = await request(app.getHttpServer())
        .get('/search-profiles/admin')
        .query({ userId: owner.userId, limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${admin.token}`);
      const body = response.body as { total: number; limit: number; offset: number; searchProfiles: unknown[] };

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ total: 2, limit: 1, offset: 0 });
      expect(body.searchProfiles).toHaveLength(1);
    });
  });

  describe('GET /search-profiles', () => {
    it("returns only the authenticated user's search profiles", async () => {
      const ownPayload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const otherPayload = { name: 'Frontend Berlin', preferences: { location: { remote: true } } };
      const owner = await login();
      const other = await login();

      const ownResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(ownPayload);

      const otherResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${other.token}`)
        .send(otherPayload);

      const ownId = (ownResponse.body as { id: string }).id;
      const otherId = (otherResponse.body as { id: string }).id;
      createdSearchProfileIds.push(ownId, otherId);

      const response = await request(app.getHttpServer())
        .get('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`);

      const body = response.body as Array<{ id: string; userId: string }>;

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: ownId, userId: owner.userId });
    });
  });

  describe('POST /search-profiles/:id/pause', () => {
    it('pauses an active search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', `Bearer ${token}`);

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'paused' });
      expect(persisted?.status).toBe('paused');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already paused', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /search-profiles/:id/activate', () => {
    it('activates a paused search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', `Bearer ${token}`);

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'active' });
      expect(persisted?.status).toBe('active');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/activate')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is not paused', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /search-profiles/:id/archive', () => {
    it('archives an active search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'archived' });
      expect(persisted?.status).toBe('archived');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already archived', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /search-profiles/:id', () => {
    it('updates the name and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior Backend Prague' });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, name: 'Senior Backend Prague' });
      expect(persisted?.name).toBe('Senior Backend Prague');
    });

    it('clears the description when explicitly set to null', async () => {
      const payload = {
        name: 'Backend Prague',
        description: 'Remote-friendly backend roles',
        preferences: { location: { remote: true } },
      };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: null });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, description: null });
      expect(persisted?.description).toBeNull();
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const { token } = await login();

      const response = await request(app.getHttpServer())
        .patch('/search-profiles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior Backend Prague' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when the updated preferences are invalid', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: { location: { remote: false } } });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when name is explicitly null', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: null });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when preferences is explicitly null', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: null });

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const intruder = await login();

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${intruder.token}`)
        .send({ name: 'Senior Backend Prague' });

      expect(response.status).toBe(404);
    });

    it('lets an admin caller update a search profile that belongs to someone else', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const owner = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const createResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer())
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Senior Backend Prague' });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(persisted?.name).toBe('Senior Backend Prague');
    });
  });

  describe('free-tier search profile limit', () => {
    it('returns 400 when creating a second active search profile at the default limit', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const { token } = await login();

      const firstResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      createdSearchProfileIds.push((firstResponse.body as { id: string }).id);

      const secondResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...payload, name: 'Second Profile' });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(400);
    });

    it('allows creating a second profile once an admin raises the limit', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const target = await login();
      const admin = await login();
      await promoteToAdmin(verificationClient, admin.userId);

      const firstResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${target.token}`)
        .send(payload);

      createdSearchProfileIds.push((firstResponse.body as { id: string }).id);

      const limitResponse = await request(app.getHttpServer())
        .patch(`/users/${target.userId}/search-profile-limit`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ limit: 2 });

      const secondResponse = await request(app.getHttpServer())
        .post('/search-profiles')
        .set('Authorization', `Bearer ${target.token}`)
        .send({ ...payload, name: 'Second Profile' });

      createdSearchProfileIds.push((secondResponse.body as { id: string }).id);

      expect(limitResponse.status).toBe(200);
      expect(secondResponse.status).toBe(201);
    });
  });
});
