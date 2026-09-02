import { UserRole } from '../types/UserRole';

export interface User {
  id: string;
  telegramUserId: string;
  telegramUsername: string | null;
  role: UserRole;
  searchProfileLimit: number;
  createdAt: string;
  updatedAt: string;
}
