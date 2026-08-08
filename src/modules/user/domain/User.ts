import { randomUUID } from 'crypto';
import { Result } from '@app/common/kernel/Result';
import { CreateUserProps } from './interfaces/CreateUserProps';
import { UserProps } from './interfaces/UserProps';
import { UserRole } from './types/UserRole';
import { InvalidSearchProfileLimitError } from './errors/InvalidSearchProfileLimitError';

const DEFAULT_SEARCH_PROFILE_LIMIT = 1;

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: CreateUserProps): User {
    return new User({
      id: randomUUID(),
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername ?? null,
      role: 'user',
      searchProfileLimit: DEFAULT_SEARCH_PROFILE_LIMIT,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  updateTelegramUsername(telegramUsername: string | null): User {
    return new User({ ...this.props, telegramUsername });
  }

  setSearchProfileLimit(limit: number): Result<User, InvalidSearchProfileLimitError> {
    if (!Number.isInteger(limit) || limit < 0) {
      return Result.fail(new InvalidSearchProfileLimitError(limit));
    }

    return Result.ok(new User({ ...this.props, searchProfileLimit: limit }));
  }

  get id(): string {
    return this.props.id;
  }

  get telegramUserId(): string {
    return this.props.telegramUserId;
  }

  get telegramUsername(): string | null {
    return this.props.telegramUsername;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get searchProfileLimit(): number {
    return this.props.searchProfileLimit;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
