import { setTimeout } from 'timers/promises';
import { PrismaSearchProfileAdapter } from '@app/modules/searchProfile/infrastructure/persistence/PrismaSearchProfileAdapter';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

export const RACE_WINDOW_MS = 200;

// Widens the gap between a use case's read and its write so concurrent requests overlap deterministically.
export class DelayedSearchProfileAdapter extends PrismaSearchProfileAdapter {
  async findById(id: string): Promise<SearchProfile | null> {
    const profile = await super.findById(id);
    await setTimeout(RACE_WINDOW_MS);

    return profile;
  }

  async findAllByUserId(userId: string): Promise<SearchProfile[]> {
    const profiles = await super.findAllByUserId(userId);
    await setTimeout(RACE_WINDOW_MS);

    return profiles;
  }
}
