export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface TokenIssuer {
  issue(userId: string): string;
  verify(token: string): { userId: string } | null;
}
