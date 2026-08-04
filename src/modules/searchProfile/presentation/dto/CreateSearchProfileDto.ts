import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchPreferencesDto } from './SearchPreferencesDto';

export class CreateSearchProfileDto {
  @ApiProperty({ example: '2c56b3f4-9a1e-4b8d-9e2a-6b7c8d9e0f1a' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'Backend Prague' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: SearchPreferencesDto })
  @ValidateNested()
  @Type(() => SearchPreferencesDto)
  preferences!: SearchPreferencesDto;
}
