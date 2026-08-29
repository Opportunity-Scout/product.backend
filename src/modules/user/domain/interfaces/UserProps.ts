import { UserRole } from '../types/UserRole';

export interface UserProps {
  id: string;
  telegramUserId: string;
  telegramUsername: string | null;
  role: UserRole;
  searchProfileLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
