import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { FindManySearchProfilesParams } from '@app/modules/searchProfile/application/ports/interfaces/FindManySearchProfilesParams';
import { FindManySearchProfilesResult } from '@app/modules/searchProfile/application/ports/interfaces/FindManySearchProfilesResult';
import { SearchProfileConcurrentModificationError } from '@app/modules/searchProfile/application/errors/SearchProfileConcurrentModificationError';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

export class FakeSearchProfileRepository implements SearchProfileRepository {
  public readonly saved: SearchProfile[] = [];

  create(searchProfile: SearchProfile): Promise<void> {
    this.saved.push(searchProfile);

    return Promise.resolve();
  }

  update(searchProfile: SearchProfile): Promise<SearchProfile> {
    const index = this.saved.findIndex((profile) => profile.id === searchProfile.id);

    if (index === -1) {
      return Promise.reject(new SearchProfileNotFoundError(searchProfile.id));
    }

    if (this.saved[index].version !== searchProfile.version) {
      return Promise.reject(new SearchProfileConcurrentModificationError(searchProfile.id));
    }

    const persisted = searchProfile.withVersion(searchProfile.version + 1);
    this.saved[index] = persisted;

    return Promise.resolve(persisted);
  }

  findById(id: string): Promise<SearchProfile | null> {
    return Promise.resolve(this.saved.find((profile) => profile.id === id) ?? null);
  }

  findAllByUserId(userId: string): Promise<SearchProfile[]> {
    return Promise.resolve(this.saved.filter((profile) => profile.userId === userId));
  }

  deleteById(id: string): Promise<void> {
    const index = this.saved.findIndex((profile) => profile.id === id);

    if (index !== -1) {
      this.saved.splice(index, 1);
    }

    return Promise.resolve();
  }

  deleteAllByUserId(userId: string): Promise<void> {
    const remaining = this.saved.filter((profile) => profile.userId !== userId);
    this.saved.length = 0;
    this.saved.push(...remaining);

    return Promise.resolve();
  }

  findMany(params: FindManySearchProfilesParams): Promise<FindManySearchProfilesResult> {
    const matching = params.userId ? this.saved.filter((profile) => profile.userId === params.userId) : this.saved;

    return Promise.resolve({
      searchProfiles: matching.slice(params.offset, params.offset + params.limit),
      total: matching.length,
    });
  }
}
