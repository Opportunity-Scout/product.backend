import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUTH_LOGIN_THROTTLE_LIMIT, AUTH_LOGIN_THROTTLE_TTL_MS } from '@app/common/rateLimiting/throttleLimits';
import { LoginWithTelegramUseCase } from '../application/loginWithTelegram/LoginWithTelegramUseCase';
import { TelegramLoginDto } from './dto/TelegramLoginDto';

// Tracked by the target telegramUserId, not IP — see CLAUDE.md "Trust proxy" for the full reasoning.
function trackByTelegramUserId(req: Record<string, unknown>): string {
  const body = req.body as Record<string, unknown> | undefined;

  return typeof body?.id === 'string' ? body.id : String(req.ip);
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginWithTelegramUseCase: LoginWithTelegramUseCase) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    perAccount: {
      limit: AUTH_LOGIN_THROTTLE_LIMIT,
      ttl: AUTH_LOGIN_THROTTLE_TTL_MS,
      getTracker: trackByTelegramUserId,
    },
  })
  @ApiOperation({ summary: 'Log in (or sign up) with a Telegram Login Widget payload' })
  @ApiOkResponse({ description: 'Login succeeded, returns a bearer token' })
  @ApiBadRequestResponse({ description: 'Missing or malformed fields in the payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid signature, or the payload is too old' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts, try again later' })
  async login(@Body() dto: TelegramLoginDto) {
    const result = await this.loginWithTelegramUseCase.execute({
      id: dto.id,
      first_name: dto.first_name,
      last_name: dto.last_name,
      username: dto.username,
      photo_url: dto.photo_url,
      auth_date: dto.auth_date,
      hash: dto.hash,
    });

    if (result.isFailure) {
      throw new UnauthorizedException(result.error.message);
    }

    return { token: result.value };
  }
}
