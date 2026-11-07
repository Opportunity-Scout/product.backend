import { PrismaUserAdapter } from '@app/modules/user/infrastructure/persistence/PrismaUserAdapter';

// Simulates a crash after the user's profiles are deleted but before the user row is.
export class FailingDeleteUserAdapter extends PrismaUserAdapter {
  deleteById(): Promise<void> {
    return Promise.reject(new Error('Simulated failure in deleteById'));
  }
}
