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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { AdminGuard } from '@app/modules/user/presentation/AdminGuard';
import { UserNotFoundError } from '@app/modules/user/application/errors/UserNotFoundError';
import { CreateSearchProfileUseCase } from '../application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from '../application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from '../application/listSearchProfiles/ListSearchProfilesUseCase';
import { ListSearchProfilesAdminUseCase } from '../application/listSearchProfilesAdmin/ListSearchProfilesAdminUseCase';
import { PauseSearchProfileUseCase } from '../application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from '../application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from '../application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from '../application/updateSearchProfile/UpdateSearchProfileUseCase';
import { DeleteSearchProfileUseCase } from '../application/deleteSearchProfile/DeleteSearchProfileUseCase';
import { SearchProfileNotFoundError } from '../application/errors/SearchProfileNotFoundError';
import { CreateSearchProfileDto } from './dto/CreateSearchProfileDto';
import { AdminCreateSearchProfileDto } from './dto/AdminCreateSearchProfileDto';
import { UpdateSearchProfileDto } from './dto/UpdateSearchProfileDto';
import { ListSearchProfilesAdminQueryDto } from './dto/ListSearchProfilesAdminQueryDto';
import { toSearchProfileResponse } from './searchProfilePresenter';

@ApiTags('search-profiles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@UseGuards(JwtAuthGuard)
@Controller('search-profiles')
export class SearchProfilesController {
  constructor(
    private readonly createSearchProfileUseCase: CreateSearchProfileUseCase,
    private readonly getSearchProfileUseCase: GetSearchProfileUseCase,
    private readonly listSearchProfilesUseCase: ListSearchProfilesUseCase,
    private readonly listSearchProfilesAdminUseCase: ListSearchProfilesAdminUseCase,
    private readonly pauseSearchProfileUseCase: PauseSearchProfileUseCase,
    private readonly activateSearchProfileUseCase: ActivateSearchProfileUseCase,
    private readonly archiveSearchProfileUseCase: ArchiveSearchProfileUseCase,
    private readonly updateSearchProfileUseCase: UpdateSearchProfileUseCase,
    private readonly deleteSearchProfileUseCase: DeleteSearchProfileUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Search Profile' })
  @ApiCreatedResponse({ description: 'Search Profile created' })
  @ApiBadRequestResponse({ description: 'Invalid name or preferences (e.g. remote=false with no country)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateSearchProfileDto) {
    const result = await this.createSearchProfileUseCase.execute({
      userId,
      name: dto.name,
      description: dto.description,
      preferences: dto.preferences,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a Search Profile on behalf of a user (admin only)' })
  @ApiCreatedResponse({ description: 'Search Profile created' })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
  @ApiNotFoundResponse({ description: 'No user with the given userId' })
  @ApiBadRequestResponse({ description: 'Invalid name or preferences (e.g. remote=false with no country)' })
  async createAdmin(@Body() dto: AdminCreateSearchProfileDto) {
    const result = await this.createSearchProfileUseCase.execute({
      userId: dto.userId,
      name: dto.name,
      description: dto.description,
      preferences: dto.preferences,
    });

    if (result.isFailure) {
      if (result.error instanceof UserNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Get()
  @ApiOperation({ summary: "List the authenticated user's Search Profiles" })
  @ApiOkResponse({ description: 'The Search Profiles for the authenticated user (possibly empty)' })
  async list(@CurrentUser('id') userId: string) {
    const searchProfiles = await this.listSearchProfilesUseCase.execute({ userId });

    return searchProfiles.map(toSearchProfileResponse);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List Search Profiles across all users, optionally filtered by userId (admin only)' })
  @ApiOkResponse({ description: 'Paginated list of Search Profiles' })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
  @ApiBadRequestResponse({ description: 'Malformed userId, or limit/offset out of range' })
  async listAdmin(@Query() query: ListSearchProfilesAdminQueryDto) {
    const { searchProfiles, total } = await this.listSearchProfilesAdminUseCase.execute({
      userId: query.userId,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      searchProfiles: searchProfiles.map(toSearchProfileResponse),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Search Profile by id (owner or admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile found' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({
    description: 'No Search Profile with this id, or the caller is neither its owner nor an admin',
  })
  async findById(@CurrentUser('id') callerId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getSearchProfileUseCase.execute({ id, callerId });

    if (result.isFailure) {
      throw new NotFoundException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Search Profile (owner or admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Search Profile deleted' })
  @ApiNotFoundResponse({
    description: 'No Search Profile with this id, or the caller is neither its owner nor an admin',
  })
  async deleteSearchProfile(@CurrentUser('id') callerId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteSearchProfileUseCase.execute({ id, callerId });

    if (result.isFailure) {
      throw new NotFoundException(result.error.message);
    }
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a Search Profile' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile paused' })
  @ApiBadRequestResponse({ description: 'Malformed id, or the Search Profile is not active' })
  @ApiNotFoundResponse({ description: 'No Search Profile with this id' })
  async pause(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.pauseSearchProfileUseCase.execute({ id, userId });

    if (result.isFailure) {
      if (result.error instanceof SearchProfileNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a paused Search Profile' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile activated' })
  @ApiBadRequestResponse({ description: 'Malformed id, or the Search Profile is not paused' })
  @ApiNotFoundResponse({ description: 'No Search Profile with this id' })
  async activate(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.activateSearchProfileUseCase.execute({ id, userId });

    if (result.isFailure) {
      if (result.error instanceof SearchProfileNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a Search Profile' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile archived' })
  @ApiBadRequestResponse({ description: 'Malformed id, or the Search Profile is already archived' })
  @ApiNotFoundResponse({ description: 'No Search Profile with this id' })
  async archive(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.archiveSearchProfileUseCase.execute({ id, userId });

    if (result.isFailure) {
      if (result.error instanceof SearchProfileNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Search Profile (owner or admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile updated' })
  @ApiBadRequestResponse({ description: 'Malformed id, invalid name, or invalid preferences' })
  @ApiNotFoundResponse({
    description: 'No Search Profile with this id, or the caller is neither its owner nor an admin',
  })
  async update(
    @CurrentUser('id') callerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSearchProfileDto,
  ) {
    const result = await this.updateSearchProfileUseCase.execute({
      id,
      callerId,
      name: dto.name,
      description: dto.description,
      preferences: dto.preferences,
    });

    if (result.isFailure) {
      if (result.error instanceof SearchProfileNotFoundError) {
        throw new NotFoundException(result.error.message);
      }

      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }
}
