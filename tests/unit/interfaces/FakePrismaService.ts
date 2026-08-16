import { UpsertArgs } from './UpsertArgs';

export interface FakePrismaService {
  searchProfile: {
    upsert: jest.Mock<Promise<unknown>, [UpsertArgs]>;
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
