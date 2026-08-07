import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenIssuer } from '../application/ports/TokenIssuer';

@Injectable()
export class JwtTokenIssuerAdapter implements TokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issue(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  verify(token: string): { userId: string } | null {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);

      return { userId: payload.sub };
    } catch {
      return null;
    }
  }
}
