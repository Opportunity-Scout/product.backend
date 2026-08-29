import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, UserRole } from '../../domain/types/UserRole';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  telegramUserId!: string;

  @ApiProperty({ nullable: true, type: String })
  telegramUsername!: string | null;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;

  @ApiProperty()
  searchProfileLimit!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
