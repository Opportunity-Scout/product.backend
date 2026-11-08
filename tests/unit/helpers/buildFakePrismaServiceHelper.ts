import { FakePrismaService, UpsertArgs } from '../interfaces';

export function buildFakePrismaService(): FakePrismaService {
  return {
    $queryRaw: jest.fn<Promise<unknown>, [TemplateStringsArray, ...unknown[]]>().mockResolvedValue([]),
    searchProfile: {
      create: jest.fn<Promise<unknown>, [{ data: Record<string, unknown> }]>(),
      updateMany: jest
        .fn<Promise<{ count: number }>, [{ where: { id: string; version: number }; data: Record<string, unknown> }]>()
        .mockResolvedValue({ count: 1 }),
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
