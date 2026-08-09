import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@app/modules/auth/presentation/CurrentUser';
import { JwtAuthGuard } from '@app/modules/auth/presentation/JwtAuthGuard';
import { CreateSearchProfileUseCase } from '../application/createSearchProfile/CreateSearchProfileUseCase';
import { GetSearchProfileUseCase } from '../application/getSearchProfile/GetSearchProfileUseCase';
import { ListSearchProfilesUseCase } from '../application/listSearchProfiles/ListSearchProfilesUseCase';
import { PauseSearchProfileUseCase } from '../application/pauseSearchProfile/PauseSearchProfileUseCase';
import { ActivateSearchProfileUseCase } from '../application/activateSearchProfile/ActivateSearchProfileUseCase';
import { ArchiveSearchProfileUseCase } from '../application/archiveSearchProfile/ArchiveSearchProfileUseCase';
import { UpdateSearchProfileUseCase } from '../application/updateSearchProfile/UpdateSearchProfileUseCase';
import { SearchProfileNotFoundError } from '../application/errors/SearchProfileNotFoundError';
import { CreateSearchProfileDto } from './dto/CreateSearchProfileDto';
import { UpdateSearchProfileDto } from './dto/UpdateSearchProfileDto';
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
    private readonly pauseSearchProfileUseCase: PauseSearchProfileUseCase,
    private readonly activateSearchProfileUseCase: ActivateSearchProfileUseCase,
    private readonly archiveSearchProfileUseCase: ArchiveSearchProfileUseCase,
    private readonly updateSearchProfileUseCase: UpdateSearchProfileUseCase,
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

  @Get()
  @ApiOperation({ summary: "List the authenticated user's Search Profiles" })
  @ApiOkResponse({ description: 'The Search Profiles for the authenticated user (possibly empty)' })
  async list(@CurrentUser('id') userId: string) {
    const searchProfiles = await this.listSearchProfilesUseCase.execute({ userId });

    return searchProfiles.map(toSearchProfileResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Search Profile by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile found' })
  @ApiBadRequestResponse({ description: 'Malformed id' })
  @ApiNotFoundResponse({ description: 'No Search Profile with this id' })
  async findById(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getSearchProfileUseCase.execute({ id, userId });

    if (result.isFailure) {
      throw new NotFoundException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
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
  @ApiOperation({ summary: 'Update a Search Profile' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Search Profile updated' })
  @ApiBadRequestResponse({ description: 'Malformed id, invalid name, or invalid preferences' })
  @ApiNotFoundResponse({ description: 'No Search Profile with this id' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSearchProfileDto,
  ) {
    const result = await this.updateSearchProfileUseCase.execute({
      id,
      userId,
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
