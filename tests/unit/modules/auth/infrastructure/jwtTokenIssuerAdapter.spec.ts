import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuerAdapter } from '@app/modules/auth/infrastructure/JwtTokenIssuerAdapter';

describe('JwtTokenIssuerAdapter', () => {
  it('issues a token that verifies back to the same userId', () => {
    const issuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const token = issuer.issue('user-1');
    const verified = issuer.verify(token);

    expect(verified?.userId).toBe('user-1');
  });

  it('returns null for a malformed token', () => {
    const issuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const verified = issuer.verify('not-a-real-token');

    expect(verified).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const issuerFirst = new JwtTokenIssuerAdapter(new JwtService({ secret: 'secret-first' }));
    const issuerSecond = new JwtTokenIssuerAdapter(new JwtService({ secret: 'secret-second' }));
    const token = issuerFirst.issue('user-1');
    const verified = issuerSecond.verify(token);

    expect(verified).toBeNull();
  });

  it('returns null for an expired token', () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const issuer = new JwtTokenIssuerAdapter(jwtService);
    const expiredToken = jwtService.sign({ sub: 'user-1' }, { expiresIn: -10 });
    const verified = issuer.verify(expiredToken);

    expect(verified).toBeNull();
  });
});
