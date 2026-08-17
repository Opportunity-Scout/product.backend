import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'Bearer token to send as `Authorization: Bearer <token>` on subsequent requests' })
  token!: string;
}
