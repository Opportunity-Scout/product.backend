import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@app/AppModule';
import { TOKEN_ISSUER, TokenIssuer } from '@app/modules/auth/application/ports/TokenIssuer';

describe('SearchProfilesController (integration)', () => {
  let app: INestApplication;
  let verificationClient: PrismaClient;
  let tokenIssuer: TokenIssuer;
  const createdSearchProfileIds: string[] = [];

  function authHeader(userId: string): string {
    return `Bearer ${tokenIssuer.issue(userId)}`;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    verificationClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    tokenIssuer = moduleRef.get(TOKEN_ISSUER, { strict: false });
  });

  afterAll(async () => {
    for (const id of createdSearchProfileIds) {
      await verificationClient.searchProfile.delete({ where: { id } });
    }

    await verificationClient.$disconnect();
    await app.close();
  });

  describe('authentication', () => {
    it('returns 401 for POST /search-profiles with no bearer token', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .send({ name: 'Backend Prague', preferences: { location: { remote: true } } });

      expect(response.status).toBe(401);
    });

    it('returns 401 for GET /search-profiles with no bearer token', async () => {
      const response = await request(app.getHttpServer() as Server).get('/search-profiles');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /search-profiles', () => {
    it('persists the created search profile in Postgres, owned by the authenticated user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const response = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-1'))
        .send(payload);

      const body = response.body as { id: string };
      createdSearchProfileIds.push(body.id);
      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: body.id } });

      expect(response.status).toBe(201);
      expect(persisted).not.toBeNull();
      expect(persisted?.userId).toBe('integration-user-1');
      expect(persisted?.name).toBe(payload.name);
    });
  });

  describe('GET /search-profiles/:id', () => {
    it('returns the search profile when it exists', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-2'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .get(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-2'));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, userId: 'integration-user-2', name: payload.name });
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/search-profiles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader('integration-user-2'));

      expect(response.status).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .get('/search-profiles/not-a-uuid')
        .set('Authorization', authHeader('integration-user-2'));

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-20'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .get(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-21'));

      expect(response.status).toBe(404);
    });
  });

  describe('GET /search-profiles', () => {
    it("returns only the authenticated user's search profiles", async () => {
      const ownPayload = { name: 'Backend Prague', preferences: { location: { remote: true } } };
      const otherPayload = { name: 'Frontend Berlin', preferences: { location: { remote: true } } };

      const ownResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-3'))
        .send(ownPayload);

      const otherResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-4'))
        .send(otherPayload);

      const ownId = (ownResponse.body as { id: string }).id;
      const otherId = (otherResponse.body as { id: string }).id;
      createdSearchProfileIds.push(ownId, otherId);

      const response = await request(app.getHttpServer() as Server)
        .get('/search-profiles')
        .set('Authorization', authHeader('integration-user-3'));

      const body = response.body as Array<{ id: string; userId: string }>;

      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: ownId, userId: 'integration-user-3' });
    });
  });

  describe('POST /search-profiles/:id/pause', () => {
    it('pauses an active search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-5'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', authHeader('integration-user-5'));

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'paused' });
      expect(persisted?.status).toBe('paused');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/pause')
        .set('Authorization', authHeader('integration-user-5'));

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already paused', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-6'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', authHeader('integration-user-6'));

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', authHeader('integration-user-6'));

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-22'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', authHeader('integration-user-23'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /search-profiles/:id/activate', () => {
    it('activates a paused search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-7'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/pause`)
        .set('Authorization', authHeader('integration-user-7'));

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', authHeader('integration-user-7'));

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'active' });
      expect(persisted?.status).toBe('active');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/activate')
        .set('Authorization', authHeader('integration-user-7'));

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is not paused', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-8'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', authHeader('integration-user-8'));

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-24'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/activate`)
        .set('Authorization', authHeader('integration-user-25'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /search-profiles/:id/archive', () => {
    it('archives an active search profile and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-9'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', authHeader('integration-user-9'));

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, status: 'archived' });
      expect(persisted?.status).toBe('archived');
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .post('/search-profiles/00000000-0000-0000-0000-000000000000/archive')
        .set('Authorization', authHeader('integration-user-9'));

      expect(response.status).toBe(404);
    });

    it('returns 400 when the search profile is already archived', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-10'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', authHeader('integration-user-10'));

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', authHeader('integration-user-10'));

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-26'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .post(`/search-profiles/${createdId}/archive`)
        .set('Authorization', authHeader('integration-user-27'));

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /search-profiles/:id', () => {
    it('updates the name and persists the change in Postgres', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-11'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-11'))
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

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-12'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-12'))
        .send({ description: null });

      const persisted = await verificationClient.searchProfile.findUnique({ where: { id: createdId } });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: createdId, description: null });
      expect(persisted?.description).toBeNull();
    });

    it('returns 404 when no search profile exists for the id', async () => {
      const response = await request(app.getHttpServer() as Server)
        .patch('/search-profiles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader('integration-user-12'))
        .send({ name: 'Senior Backend Prague' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when the updated preferences are invalid', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-13'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-13'))
        .send({ preferences: { location: { remote: false } } });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when name is explicitly null', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-14'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-14'))
        .send({ name: null });

      expect(response.status).toBe(400);
    });

    it('returns 400, not 500, when preferences is explicitly null', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-15'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-15'))
        .send({ preferences: null });

      expect(response.status).toBe(400);
    });

    it('returns 404 when the search profile belongs to a different user', async () => {
      const payload = { name: 'Backend Prague', preferences: { location: { remote: true } } };

      const createResponse = await request(app.getHttpServer() as Server)
        .post('/search-profiles')
        .set('Authorization', authHeader('integration-user-28'))
        .send(payload);

      const createdId = (createResponse.body as { id: string }).id;
      createdSearchProfileIds.push(createdId);

      const response = await request(app.getHttpServer() as Server)
        .patch(`/search-profiles/${createdId}`)
        .set('Authorization', authHeader('integration-user-29'))
        .send({ name: 'Senior Backend Prague' });

      expect(response.status).toBe(404);
    });
  });
});
