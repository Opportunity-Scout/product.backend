import { SearchProfileRepository } from '@app/modules/searchProfile/application/ports/SearchProfileRepository';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

export class FakeSearchProfileRepository implements SearchProfileRepository {
  public readonly saved: SearchProfile[] = [];

  save(searchProfile: SearchProfile): Promise<void> {
    const index = this.saved.findIndex((profile) => profile.id === searchProfile.id);

    if (index === -1) {
      this.saved.push(searchProfile);
    } else {
      this.saved[index] = searchProfile;
    }

    return Promise.resolve();
  }

  findById(id: string): Promise<SearchProfile | null> {
    return Promise.resolve(this.saved.find((profile) => profile.id === id) ?? null);
  }

  findAllByUserId(userId: string): Promise<SearchProfile[]> {
    return Promise.resolve(this.saved.filter((profile) => profile.userId === userId));
  }
}
