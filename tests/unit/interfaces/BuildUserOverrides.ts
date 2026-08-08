import { UserRole } from '@app/modules/user/domain/types/UserRole';

export interface BuildUserOverrides {
  id?: string;
  telegramUserId?: string;
  telegramUsername?: string;
  role?: UserRole;
  searchProfileLimit?: number;
}
