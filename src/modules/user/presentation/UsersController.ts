import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@app/modules/auth/presentation/CurrentUser';
import { JwtAuthGuard } from '@app/modules/auth/presentation/JwtAuthGuard';
import { SetSearchProfileLimitUseCase } from '../application/setSearchProfileLimit/SetSearchProfileLimitUseCase';
import { ListUsersUseCase } from '../application/listUsers/ListUsersUseCase';
import { DeleteUserUseCase } from '../application/deleteUser/DeleteUserUseCase';
import { UserNotFoundError } from '../application/errors/UserNotFoundError';
import { AdminGuard } from './AdminGuard';
import { SetSearchProfileLimitDto } from './dto/SetSearchProfileLimitDto';
import { ListUsersQueryDto } from './dto/ListUsersQueryDto';
import { toUserResponse } from './userPresenter';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly setSearchProfileLimitUseCase: SetSearchProfileLimitUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List users, optionally filtered by Telegram username (admin only)' })
  @ApiOkResponse({ description: 'Paginated list of users' })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
  @ApiBadRequestResponse({ description: 'limit or offset out of range' })
  async list(@Query() query: ListUsersQueryDto) {
    const { users, total } = await this.listUsersUseCase.execute({
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    return { users: users.map(toUserResponse), total, limit: query.limit, offset: query.offset };
  }

  @Patch(':id/search-profile-limit')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Set a user's Search Profile limit (admin only)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Limit updated' })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an account (and all of its Search Profiles) — self-service, or admin override' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @ApiNotFoundResponse({ description: 'No user with this id, or the caller is neither its owner nor an admin' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') callerId: string) {
    const result = await this.deleteUserUseCase.execute({ id, callerId });

    if (result.isFailure) {
      throw new NotFoundException(result.error.message);
    }
  }
}
