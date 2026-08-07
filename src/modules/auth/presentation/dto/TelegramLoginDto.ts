import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Field names mirror Telegram's own Login Widget wire format exactly
// (snake_case) — the HMAC signature is computed over these exact keys, so
// renaming them to our usual camelCase would break verification.
export class TelegramLoginDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  photo_url?: string;

  @ApiProperty({ description: 'Unix timestamp (seconds) of when Telegram signed this payload' })
  @IsNumber()
  auth_date!: number;

  @ApiProperty({ description: 'HMAC-SHA256 signature from Telegram, verified against the bot token' })
  @IsString()
  hash!: string;
}
