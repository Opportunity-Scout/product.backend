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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/modules/auth/presentation/JwtAuthGuard';
import { SetSearchProfileLimitUseCase } from '../application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { UserNotFoundError } from '../application/errors/UserNotFoundError';
import { AdminGuard } from './AdminGuard';
import { SetSearchProfileLimitDto } from './dto/SetSearchProfileLimitDto';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly setSearchProfileLimitUseCase: SetSearchProfileLimitUseCase) {}

  @Patch(':id/search-profile-limit')
  @ApiOperation({ summary: "Set a user's Search Profile limit (admin only)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Limit updated' })
  @ApiBadRequestResponse({ description: 'Malformed id, or limit is not a non-negative integer' })
  @ApiNotFoundResponse({ description: 'No user with this id' })
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
