import { ApiProperty } from '@nestjs/swagger';
import { SearchProfileResponseDto } from './SearchProfileResponseDto';

export class ListSearchProfilesAdminResponseDto {
  @ApiProperty({ type: [SearchProfileResponseDto] })
  searchProfiles!: SearchProfileResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
