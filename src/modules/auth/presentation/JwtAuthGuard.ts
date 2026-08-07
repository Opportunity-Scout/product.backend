import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TOKEN_ISSUER, TokenIssuer } from '../application/ports/TokenIssuer';
import { AuthenticatedRequest } from './interfaces/AuthenticatedRequest';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    const [scheme, token] = authHeader?.split(' ') ?? [];
    const bearerToken = scheme?.toLowerCase() === 'bearer' ? token : undefined;

    if (!bearerToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const verified = this.tokenIssuer.verify(bearerToken);

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = { id: verified.userId };

    return true;
  }
}
