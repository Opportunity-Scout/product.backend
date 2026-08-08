import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSearchProfileLimitDto {
  @ApiProperty({ example: 3, description: 'New Search Profile limit for this user (0 disables new creations)' })
  @IsInt()
  @Min(0)
  limit!: number;
}
