import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginWithTelegramUseCase } from '../application/loginWithTelegram/LoginWithTelegramUseCase';
import { TelegramLoginDto } from './dto/TelegramLoginDto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginWithTelegramUseCase: LoginWithTelegramUseCase) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in (or sign up) with a Telegram Login Widget payload' })
  @ApiResponse({ status: 200, description: 'Login succeeded, returns a bearer token' })
  @ApiResponse({ status: 400, description: 'Missing or malformed fields in the payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature, or the payload is too old' })
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
