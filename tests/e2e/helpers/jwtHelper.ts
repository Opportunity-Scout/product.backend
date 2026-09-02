import { expect } from '@playwright/test';
import { JwtClaims } from './interfaces';
import { commonHelper } from './commonHelper';

// Decode-only, deliberately — this project has no business holding the
// server's JWT_SECRET (a private signing secret, a different trust boundary
// than TELEGRAM_BOT_TOKEN), so it can't cryptographically verify a token,
// only inspect the claims it carries. That matches what an external API
// consumer actually sees: nobody outside the server verifies the signature.
class JwtHelper {
  decode(token: string): JwtClaims {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error(`Not a well-formed JWT (expected 3 dot-separated segments, got ${parts.length}): ${token}`);
    }

    const [, payload] = parts;
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');

    return JSON.parse(decoded) as JwtClaims;
  }

  // Nothing downstream needs the decoded claims themselves — unlike
  // ResponseContract.validate, this is a pure assertion with no data for a
  // caller to consume afterward, so "expect" fits without the naming
  // tension that method ran into.
  expectTokenIsValid(token: string): void {
    const claims = this.decode(token);

    expect(commonHelper.isValidUuidV4(claims.sub), 'sub should be a UUID v4').toBe(true);
    expect(claims.exp, 'exp should be after iat').toBeGreaterThan(claims.iat);
    expect(claims.exp * 1000, 'Token should not already be expired').toBeGreaterThan(Date.now());
  }
}

export const jwtHelper = new JwtHelper();
