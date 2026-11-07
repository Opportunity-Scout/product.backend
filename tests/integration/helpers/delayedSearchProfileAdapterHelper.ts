import { setTimeout } from 'timers/promises';
import { PrismaSearchProfileAdapter } from '@app/modules/searchProfile/infrastructure/persistence/PrismaSearchProfileAdapter';
import { SearchProfile } from '@app/modules/searchProfile/domain/SearchProfile';

export const RACE_WINDOW_MS = 200;

// Widens the gap between the limit check's read and the insert so concurrent creates overlap deterministically.
export class DelayedSearchProfileAdapter extends PrismaSearchProfileAdapter {
  async findAllByUserId(userId: string): Promise<SearchProfile[]> {
    const profiles = await super.findAllByUserId(userId);
    await setTimeout(RACE_WINDOW_MS);

    return profiles;
  }
}
