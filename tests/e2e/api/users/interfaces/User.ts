export interface User {
  id: string;
  telegramUserId: string;
  telegramUsername: string | null;
  role: string;
  searchProfileLimit: number;
  createdAt: string;
}
