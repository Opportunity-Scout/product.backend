import { expect } from '@playwright/test';
import { JwtClaims } from './interfaces';

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
  //
  // async only because of the `uuid` import below: `uuid` (v9+) ships ESM
  // only, while this project is CommonJS, so a static `import ... from
  // 'uuid'` doesn't compile — a dynamic `import('uuid')` is Node's own
  // documented way for a CJS module to consume an ESM-only package, but
  // dynamic import is inherently a Promise, which makes this method async
  // too.
  async expectTokenIsValid(token: string): Promise<void> {
    const { validate: isUuid, version: uuidVersion } = await import('uuid');
    const claims = this.decode(token);

    expect(isUuid(claims.sub) && uuidVersion(claims.sub) === 4, 'sub should be a UUID v4').toBe(true);
    expect(claims.exp, 'exp should be after iat').toBeGreaterThan(claims.iat);
    expect(claims.exp * 1000, 'Token should not already be expired').toBeGreaterThan(Date.now());
  }
}

export const jwtHelper = new JwtHelper();
