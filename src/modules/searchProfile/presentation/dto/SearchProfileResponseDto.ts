import { ApiProperty } from '@nestjs/swagger';
import { SEARCH_PROFILE_STATUSES, SearchProfileStatus } from '../../domain/types/SearchProfileStatus';
import { SearchPreferencesResponseDto } from './SearchPreferencesResponseDto';

export class SearchProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ enum: SEARCH_PROFILE_STATUSES })
  status!: SearchProfileStatus;

  @ApiProperty({ type: SearchPreferencesResponseDto })
  preferences!: SearchPreferencesResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true, type: Date })
  lastMatchedAt!: Date | null;
}
