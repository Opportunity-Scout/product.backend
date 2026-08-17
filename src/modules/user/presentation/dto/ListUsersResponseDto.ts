import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './UserResponseDto';

export class ListUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  users!: UserResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
