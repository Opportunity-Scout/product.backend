import { randomUUID } from 'crypto';
import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { SearchPreferences } from './SearchPreferences';
import { SearchProfileStatus } from './types/SearchProfileStatus';
import { CreateSearchProfileProps } from './interfaces/CreateSearchProfileProps';
import { SearchProfileProps } from './interfaces/SearchProfileProps';

export class InvalidSearchProfileNameError extends DomainError {
  constructor() {
    super('Search profile name must not be empty');
  }
}

export class SearchProfile {
  private constructor(private readonly props: SearchProfileProps) {}

  static create(input: CreateSearchProfileProps): Result<SearchProfile, InvalidSearchProfileNameError> {
    // `?.` guards against callers that construct SearchProfile outside the validated DTO/HTTP path
    // (TS's `name: string` is a compile-time-only guarantee, erased at runtime).
    const name = input.name?.trim();

    if (!name) {
      return Result.fail(new InvalidSearchProfileNameError());
    }

    const now = new Date();

    return Result.ok(
      new SearchProfile({
        id: randomUUID(),
        userId: input.userId,
        name,
        description: input.description ?? null,
        status: 'active',
        preferences: input.preferences,
        createdAt: now,
        updatedAt: now,
        lastMatchedAt: null,
      }),
    );
  }

  static reconstitute(props: SearchProfileProps): SearchProfile {
    return new SearchProfile(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): SearchProfileStatus {
    return this.props.status;
  }

  get preferences(): SearchPreferences {
    return this.props.preferences;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastMatchedAt(): Date | null {
    return this.props.lastMatchedAt;
  }
}
