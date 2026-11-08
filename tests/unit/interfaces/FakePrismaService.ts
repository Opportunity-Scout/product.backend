import { UpsertArgs } from './UpsertArgs';

export interface FakePrismaService {
  $queryRaw: jest.Mock<Promise<unknown>, [TemplateStringsArray, ...unknown[]]>;
  searchProfile: {
    create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
    updateMany: jest.Mock<
      Promise<{ count: number }>,
      [{ where: { id: string; version: number }; data: Record<string, unknown> }]
    >;
    findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
    findMany: jest.Mock<Promise<unknown>, [{ where: unknown; take?: number; skip?: number }]>;
    count: jest.Mock<Promise<number>, [{ where: unknown }]>;
    delete: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
  };
  user: {
    upsert: jest.Mock<Promise<unknown>, [UpsertArgs]>;
    findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } | { telegramUserId: string } }]>;
    findMany: jest.Mock<Promise<unknown>, [{ where: unknown; take: number; skip: number }]>;
    count: jest.Mock<Promise<number>, [{ where: unknown }]>;
    delete: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
  };
}
