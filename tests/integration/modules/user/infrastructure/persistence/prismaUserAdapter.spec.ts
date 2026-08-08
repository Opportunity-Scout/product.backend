import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/AppModule';
import { PrismaService } from '@app/common/persistence/PrismaService';
import { USER_REPOSITORY, UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { User } from '@app/modules/user/domain/User';

describe('PrismaUserAdapter (integration)', () => {
  let moduleRef: TestingModule;
  let repository: UserRepository;
  let prismaService: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    repository = moduleRef.get<UserRepository>(USER_REPOSITORY);
    prismaService = moduleRef.get(PrismaService, { strict: false });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prismaService.user.delete({ where: { id } });
    }

    await moduleRef.close();
  });

  it('reconstructs an equivalent user after a real save/findById round trip', async () => {
    const user = User.create({ telegramUserId: 'integration-telegram-1', telegramUsername: 'oleg' });
    createdUserIds.push(user.id);

    await repository.save(user);
    const found = await repository.findById(user.id);

    expect(found).not.toBeNull();
    expect(found).not.toBe(user);
    expect(found?.id).toBe(user.id);
    expect(found?.telegramUserId).toBe('integration-telegram-1');
    expect(found?.telegramUsername).toBe('oleg');
    expect(found?.role).toBe('user');
    expect(found?.searchProfileLimit).toBe(1);
  });

  it('persists an updated search profile limit', async () => {
    const user = User.create({ telegramUserId: 'integration-telegram-3' });
    createdUserIds.push(user.id);
    await repository.save(user);

    const limitResult = user.setSearchProfileLimit(5);

    if (limitResult.isFailure) {
      throw limitResult.error;
    }

    await repository.save(limitResult.value);
    const found = await repository.findById(user.id);

    expect(found?.searchProfileLimit).toBe(5);
  });

  it('finds a user by telegram id', async () => {
    const user = User.create({ telegramUserId: 'integration-telegram-2' });
    createdUserIds.push(user.id);

    await repository.save(user);
    const found = await repository.findByTelegramUserId('integration-telegram-2');

    expect(found?.id).toBe(user.id);
  });

  it('returns null when no user exists for the given id', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(found).toBeNull();
  });
});
