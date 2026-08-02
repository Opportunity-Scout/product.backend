import { UpsertArgs } from './UpsertArgs';

export interface FakePrismaService {
  searchProfile: {
    upsert: jest.Mock<Promise<unknown>, [UpsertArgs]>;
    findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;
  };
}
