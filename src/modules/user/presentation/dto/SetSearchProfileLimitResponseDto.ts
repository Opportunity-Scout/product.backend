import { ApiProperty } from '@nestjs/swagger';

export class SetSearchProfileLimitResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  searchProfileLimit!: number;
}
