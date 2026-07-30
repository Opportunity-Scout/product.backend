import { Injectable } from '@nestjs/common';
import { SearchProfile } from '../../domain/SearchProfile';
import { SearchProfileRepository } from '../../application/ports/SearchProfileRepository';

@Injectable()
export class InMemorySearchProfileRepository implements SearchProfileRepository {
  private readonly items = new Map<string, SearchProfile>();

  save(searchProfile: SearchProfile): Promise<void> {
    this.items.set(searchProfile.id, searchProfile);
    return Promise.resolve();
  }

  findById(id: string): Promise<SearchProfile | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
}
