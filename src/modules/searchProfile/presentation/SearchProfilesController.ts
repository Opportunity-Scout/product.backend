import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSearchProfileUseCase } from '../application/createSearchProfile/CreateSearchProfileUseCase';
import { CreateSearchProfileDto } from './dto/CreateSearchProfileDto';
import { toSearchProfileResponse } from './searchProfilePresenter';

@ApiTags('search-profiles')
@Controller('search-profiles')
export class SearchProfilesController {
  constructor(private readonly createSearchProfileUseCase: CreateSearchProfileUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Search Profile' })
  @ApiResponse({ status: 201, description: 'Search Profile created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid name or preferences (e.g. remote=false with no country)',
  })
  async create(@Body() dto: CreateSearchProfileDto) {
    const result = await this.createSearchProfileUseCase.execute({
      userId: dto.userId,
      name: dto.name,
      description: dto.description,
      preferences: dto.preferences,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return toSearchProfileResponse(result.value);
  }
}
