import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/presentation/JwtAuthGuard';
import { SetSearchProfileLimitUseCase } from '../application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { UserNotFoundError } from '../application/errors/UserNotFoundError';
import { AdminGuard } from './AdminGuard';
import { SetSearchProfileLimitDto } from './dto/SetSearchProfileLimitDto';

@ApiTags('users')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid bearer token' })
@ApiResponse({ status: 403, description: 'Caller is not an admin' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly setSearchProfileLimitUseCase: SetSearchProfileLimitUseCase) {}

  @Patch(':id/search-profile-limit')
  @ApiOperation({ summary: "Set a user's Search Profile limit (admin only)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Limit updated' })
  @ApiResponse({ status: 400, description: 'Malformed id, or limit is not a non-negative integer' })
  @ApiResponse({ status: 404, description: 'No user with this id' })
  async setSearchProfileLimit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetSearchProfileLimitDto) {
    const result = await this.setSearchProfileLimitUseCase.execute({ userId: id, limit: dto.limit });

    if (result.isFailure) {
      if (result.error instanceof UserNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return { id: result.value.id, searchProfileLimit: result.value.searchProfileLimit };
  }
}
