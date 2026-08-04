import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListSearchProfilesQueryDto {
  @ApiProperty({ example: '2c56b3f4-9a1e-4b8d-9e2a-6b7c8d9e0f1a' })
  @IsString()
  userId!: string;
}
