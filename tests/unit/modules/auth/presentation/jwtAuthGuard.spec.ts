import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '@app/modules/auth/presentation/JwtAuthGuard';
import { JwtTokenIssuerAdapter } from '@app/modules/auth/infrastructure/JwtTokenIssuerAdapter';
import { AuthenticatedRequest } from '@app/modules/auth/presentation/interfaces/AuthenticatedRequest';

function buildContext(headers: Record<string, string>): ExecutionContext {
  const request = { headers } as AuthenticatedRequest;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('allows the request and attaches req.user for a valid token', () => {
    const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const guard = new JwtAuthGuard(tokenIssuer);
    const token = tokenIssuer.issue('user-1');
    const context = buildContext({ authorization: `Bearer ${token}` });
    const canActivate = guard.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it('allows the request when the auth scheme is lowercase', () => {
    const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const guard = new JwtAuthGuard(tokenIssuer);
    const token = tokenIssuer.issue('user-1');
    const context = buildContext({ authorization: `bearer ${token}` });
    const canActivate = guard.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it('rejects a request with no authorization header', () => {
    const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const guard = new JwtAuthGuard(tokenIssuer);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request with a malformed authorization header', () => {
    const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const guard = new JwtAuthGuard(tokenIssuer);
    const context = buildContext({ authorization: 'not-a-bearer-token' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request with an invalid token', () => {
    const tokenIssuer = new JwtTokenIssuerAdapter(new JwtService({ secret: 'test-secret' }));
    const guard = new JwtAuthGuard(tokenIssuer);
    const context = buildContext({ authorization: 'Bearer not-a-real-token' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request with an expired token', () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const tokenIssuer = new JwtTokenIssuerAdapter(jwtService);
    const guard = new JwtAuthGuard(tokenIssuer);
    const expiredToken = jwtService.sign({ sub: 'user-1' }, { expiresIn: -10 });
    const context = buildContext({ authorization: `Bearer ${expiredToken}` });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
