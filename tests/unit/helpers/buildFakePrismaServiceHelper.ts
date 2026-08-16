import { FakePrismaService, UpsertArgs } from '../interfaces';

export function buildFakePrismaService(): FakePrismaService {
  return {
    searchProfile: {
      upsert: jest.fn<Promise<unknown>, [UpsertArgs]>(),
      findUnique: jest.fn<Promise<unknown>, [{ where: { id: string } }]>(),
      findMany: jest.fn<Promise<unknown>, [{ where: unknown; take?: number; skip?: number }]>().mockResolvedValue([]),
      count: jest.fn<Promise<number>, [{ where: unknown }]>().mockResolvedValue(0),
      delete: jest.fn<Promise<unknown>, [{ where: { id: string } }]>(),
    },
    user: {
      upsert: jest.fn<Promise<unknown>, [UpsertArgs]>(),
      findUnique: jest.fn<Promise<unknown>, [{ where: { id: string } | { telegramUserId: string } }]>(),
      findMany: jest.fn<Promise<unknown>, [{ where: unknown; take: number; skip: number }]>().mockResolvedValue([]),
      count: jest.fn<Promise<number>, [{ where: unknown }]>().mockResolvedValue(0),
      delete: jest.fn<Promise<unknown>, [{ where: { id: string } }]>(),
    },
  };
}
