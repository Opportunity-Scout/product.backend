import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchPreferencesDto } from './SearchPreferencesDto';

export class UpdateSearchProfileDto {
  @ApiPropertyOptional({ description: 'Omit to leave the name unchanged' })
  @ValidateIf((dto: UpdateSearchProfileDto) => dto.name !== undefined)
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Omit to leave the description unchanged; send `null` to clear it',
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ type: SearchPreferencesDto, description: 'Omit to leave preferences unchanged' })
  @ValidateIf((dto: UpdateSearchProfileDto) => dto.preferences !== undefined)
  @ValidateNested()
  @Type(() => SearchPreferencesDto)
  preferences?: SearchPreferencesDto;
}
