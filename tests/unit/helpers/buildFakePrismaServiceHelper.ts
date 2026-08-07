import { FakePrismaService, UpsertArgs } from '../interfaces';

export function buildFakePrismaService(): FakePrismaService {
  return {
    searchProfile: {
      upsert: jest.fn<Promise<unknown>, [UpsertArgs]>(),
      findUnique: jest.fn<Promise<unknown>, [{ where: { id: string } }]>(),
      findMany: jest.fn<Promise<unknown>, [{ where: { userId: string } }]>(),
    },
    user: {
      upsert: jest.fn<Promise<unknown>, [UpsertArgs]>(),
      findUnique: jest.fn<Promise<unknown>, [{ where: { id: string } | { telegramUserId: string } }]>(),
    },
  };
}
