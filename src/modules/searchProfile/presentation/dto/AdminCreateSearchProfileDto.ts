import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchPreferencesDto } from './SearchPreferencesDto';

export class AdminCreateSearchProfileDto {
  @ApiProperty({ format: 'uuid', description: 'The user this Search Profile is created for' })
  @IsUUID()
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
