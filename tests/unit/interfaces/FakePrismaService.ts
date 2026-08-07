import { UpsertArgs } from './UpsertArgs';

export interface FakePrismaService {
  searchProfile: {
    upsert: jest.Mock<Promise<unknown>, [UpsertArgs]>;
    findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
    findMany: jest.Mock<Promise<unknown>, [{ where: { userId: string } }]>;
  };
  user: {
    upsert: jest.Mock<Promise<unknown>, [UpsertArgs]>;
    findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } | { telegramUserId: string } }]>;
  };
}
