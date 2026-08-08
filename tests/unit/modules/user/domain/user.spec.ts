import { User } from '@app/modules/user/domain/User';

describe('User', () => {
  it('creates a user with the given telegram id', () => {
    const user = User.create({ telegramUserId: '12345' });

    expect(user.telegramUserId).toBe('12345');
    expect(user.telegramUsername).toBeNull();
  });

  it('keeps the provided telegram username', () => {
    const user = User.create({ telegramUserId: '12345', telegramUsername: 'oleg' });

    expect(user.telegramUsername).toBe('oleg');
  });

  it('reconstitutes a user from trusted, already-valid props', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const props = {
      id: 'existing-id',
      telegramUserId: '12345',
      telegramUsername: 'oleg',
      role: 'admin' as const,
      searchProfileLimit: 5,
      createdAt: now,
    };

    const user = User.reconstitute(props);

    expect(user.id).toBe('existing-id');
    expect(user.telegramUserId).toBe('12345');
    expect(user.telegramUsername).toBe('oleg');
    expect(user.role).toBe('admin');
    expect(user.searchProfileLimit).toBe(5);
    expect(user.createdAt).toBe(now);
  });

  it('defaults role to user and search profile limit to 1 on create', () => {
    const user = User.create({ telegramUserId: '12345' });

    expect(user.role).toBe('user');
    expect(user.searchProfileLimit).toBe(1);
  });

  it('updates the telegram username, keeping everything else the same', () => {
    const user = User.create({ telegramUserId: '12345', telegramUsername: 'oleg' });
    const updated = user.updateTelegramUsername('new-username');

    expect(updated.telegramUsername).toBe('new-username');
    expect(updated.id).toBe(user.id);
    expect(updated.telegramUserId).toBe(user.telegramUserId);
  });

  it('clears the telegram username when updated to null', () => {
    const user = User.create({ telegramUserId: '12345', telegramUsername: 'oleg' });
    const updated = user.updateTelegramUsername(null);

    expect(updated.telegramUsername).toBeNull();
  });

  it('sets a new search profile limit, keeping everything else the same', () => {
    const user = User.create({ telegramUserId: '12345' });
    const result = user.setSearchProfileLimit(3);

    expect(result.isSuccess).toBe(true);
    expect(result.value.searchProfileLimit).toBe(3);
    expect(result.value.id).toBe(user.id);
  });

  it('allows setting the search profile limit to 0', () => {
    const user = User.create({ telegramUserId: '12345' });
    const result = user.setSearchProfileLimit(0);

    expect(result.isSuccess).toBe(true);
    expect(result.value.searchProfileLimit).toBe(0);
  });

  it('fails to set a negative search profile limit', () => {
    const user = User.create({ telegramUserId: '12345' });
    const result = user.setSearchProfileLimit(-1);

    expect(result.isFailure).toBe(true);
  });

  it('fails to set a non-integer search profile limit', () => {
    const user = User.create({ telegramUserId: '12345' });
    const result = user.setSearchProfileLimit(1.5);

    expect(result.isFailure).toBe(true);
  });
});
