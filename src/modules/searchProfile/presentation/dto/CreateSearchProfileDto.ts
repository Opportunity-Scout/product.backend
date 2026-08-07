import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchPreferencesDto } from './SearchPreferencesDto';

export class CreateSearchProfileDto {
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
