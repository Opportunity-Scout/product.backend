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
      createdAt: now,
    };

    const user = User.reconstitute(props);

    expect(user.id).toBe('existing-id');
    expect(user.telegramUserId).toBe('12345');
    expect(user.telegramUsername).toBe('oleg');
    expect(user.createdAt).toBe(now);
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
});
