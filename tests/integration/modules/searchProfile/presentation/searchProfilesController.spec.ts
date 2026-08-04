import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@app/AppModule';

describe('SearchProfilesController (integration)', () => {
  let app: INestApplication;
  let verificationClient: PrismaClient;
  const createdSearchProfileIds: string[] = [];

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
    for (const id of createdSearchProfileIds) {
      await verificationClient.searchProfile.delete({ where: { id } });
    }

    await verificationClient.$disconnect();
    await app.close();
  });

  describe('POST /search-profiles', () => {
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
      createdSearchProfileIds.push(body.id);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: body.id } });

      expect(response.status).toBe(201);
      expect(persisted).not.toBeNull();
      expect(persisted?.userId).toBe(payload.userId);
      expect(persisted?.name).toBe(payload.name);
    });
  });

  describe('GET /search-profiles/:id', () => {
    it('returns the search profile when it exists', async () => {
      const payload = {
        userId: 'integration-user-2',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);
      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server).get(`/search-profiles/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, userId: payload.userId, name: payload.name });
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server).get(
        '/search-profiles/00000000-0000-0000-0000-000000000000',
      );

      expect(response.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      const response = await request(app.getHttpServer() as Server).get('/search-profiles/not-a-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /search-profiles', () => {
    it('returns only the search profiles belonging to the given user', async () => {
      const ownPayload = {
        userId: 'integration-user-3',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const otherPayload = {
        userId: 'integration-user-4',
        name: 'Frontend Berlin',
        preferences: { location: { remote: true } },
      };

      const ownResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(ownPayload);

      const otherResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(otherPayload);

      const ownId = (ownResponse.body as { id: string }).id;
      const otherId = (otherResponse.body as { id: string }).id;
      createdSearchProfileIds.push(ownId, otherId);
      const response = await request(app.getHttpServer() as Server).get('/search-profiles?userId=integration-user-3');
      const body = response.body as Array<{ id: string; userId: string }>;

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: ownId, userId: ownPayload.userId });
    });

    it('returns 400 when the userId query param is missing', async () => {
      const response = await request(app.getHttpServer() as Server).get('/search-profiles');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /search-profiles/:id/pause', () => {
    it('pauses an active search profile and persists the change in Postgres', async () => {
      const payload = {
        userId: 'integration-user-5',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);
      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/pause`);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'paused' });
      expect(persisted?.status).toBe('paused');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server).post(
        '/search-profiles/00000000-0000-0000-0000-000000000000/pause',
      );

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already paused', async () => {
      const payload = {
        userId: 'integration-user-6',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);
      await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/pause`);
      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/pause`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /search-profiles/:id/activate', () => {
    it('activates a paused search profile and persists the change in Postgres', async () => {
      const payload = {
        userId: 'integration-user-7',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);
      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/pause`);
      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/activate`);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'active' });
      expect(persisted?.status).toBe('active');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server).post(
        '/search-profiles/00000000-0000-0000-0000-000000000000/activate',
      );

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is not paused', async () => {
      const payload = {
        userId: 'integration-user-8',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);
      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/activate`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /search-profiles/:id/archive', () => {
    it('archives an active search profile and persists the change in Postgres', async () => {
      const payload = {
        userId: 'integration-user-9',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/archive`);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'archived' });
      expect(persisted?.status).toBe('archived');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server).post(
        '/search-profiles/00000000-0000-0000-0000-000000000000/archive',
      );

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already archived', async () => {
      const payload = {
        userId: 'integration-user-10',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/archive`);
      const response = await request(app.getHttpServer() as Server).post(`/search-profiles/${createdId}/archive`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /search-profiles/:id', () => {
    it('updates the name and persists the change in Postgres', async () => {
      const payload = {
        userId: 'integration-user-11',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .send({ name: 'Senior Backend Prague' });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, name: 'Senior Backend Prague' });
      expect(persisted?.name).toBe('Senior Backend Prague');
    });

    it('clears the description when explicitly set to null', async () => {
      const payload = {
        userId: 'integration-user-12',
        name: 'Backend Prague',
        description: 'Remote-friendly backend roles',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .send({ description: null });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, description: null });
      expect(persisted?.description).toBeNull();
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .patch('/search-profiles/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Senior Backend Prague' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when the updated preferences are invalid', async () => {
      const payload = {
        userId: 'integration-user-13',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .send({ preferences: { location: { remote: false } } });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when name is explicitly null', async () => {
      const payload = {
        userId: 'integration-user-14',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .send({ name: null });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when preferences is explicitly null', async () => {
      const payload = {
        userId: 'integration-user-15',
        name: 'Backend Prague',
        preferences: { location: { remote: true } },
      };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .send({ preferences: null });

      expect(response.status).toBe(400);
    });
  });
});
