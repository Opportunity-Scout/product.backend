import { randomUUID } from 'crypto';
import { Result } from '@app/common/kernel/Result';
import { SearchPreferences } from './SearchPreferences';
import { SearchProfileStatus } from './types/SearchProfileStatus';
import { CreateSearchProfileProps } from './interfaces/CreateSearchProfileProps';
import { SearchProfileProps } from './interfaces/SearchProfileProps';
import { UpdateSearchProfileDetailsInput } from './interfaces/UpdateSearchProfileDetailsInput';
import { InvalidSearchProfileNameError } from './errors/InvalidSearchProfileNameError';
import { InvalidSearchProfileStatusTransitionError } from './errors/InvalidSearchProfileStatusTransitionError';

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

  pause(): Result<SearchProfile, InvalidSearchProfileStatusTransitionError> {
    if (this.props.status !== 'active') {
      return Result.fail(new InvalidSearchProfileStatusTransitionError(this.props.status, 'paused'));
    }

    return Result.ok(new SearchProfile({ ...this.props, status: 'paused', updatedAt: new Date() }));
  }

  activate(): Result<SearchProfile, InvalidSearchProfileStatusTransitionError> {
    if (this.props.status !== 'paused') {
      return Result.fail(new InvalidSearchProfileStatusTransitionError(this.props.status, 'active'));
    }

    return Result.ok(new SearchProfile({ ...this.props, status: 'active', updatedAt: new Date() }));
  }

  archive(): Result<SearchProfile, InvalidSearchProfileStatusTransitionError> {
    if (this.props.status === 'archived') {
      return Result.fail(new InvalidSearchProfileStatusTransitionError(this.props.status, 'archived'));
    }

    return Result.ok(new SearchProfile({ ...this.props, status: 'archived', updatedAt: new Date() }));
  }

  updateDetails(input: UpdateSearchProfileDetailsInput): Result<SearchProfile, InvalidSearchProfileNameError> {
    let name = this.props.name;

    if (input.name !== undefined) {
      const trimmed = input.name?.trim();

      if (!trimmed) {
        return Result.fail(new InvalidSearchProfileNameError());
      }

      name = trimmed;
    }

    return Result.ok(
      new SearchProfile({
        ...this.props,
        name,
        description: input.description !== undefined ? input.description : this.props.description,
        preferences: input.preferences ?? this.props.preferences,
        updatedAt: new Date(),
      }),
    );
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
