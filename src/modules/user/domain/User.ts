import { randomUUID } from 'crypto';
import { CreateUserProps } from './interfaces/CreateUserProps';
import { UserProps } from './interfaces/UserProps';

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: CreateUserProps): User {
    return new User({
      id: randomUUID(),
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  updateTelegramUsername(telegramUsername: string | null): User {
    return new User({ ...this.props, telegramUsername });
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

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
