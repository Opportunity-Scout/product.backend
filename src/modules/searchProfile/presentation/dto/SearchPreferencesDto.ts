import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EMPLOYMENT_TYPES, EmploymentType } from '../../domain/valueObjects/types/EmploymentType';
import { SENIORITY_LEVELS, Seniority } from '../../domain/valueObjects/types/Seniority';

class KeywordFilterDto {
  @ApiPropertyOptional({ type: [String], example: ['nestjs', 'node'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  include?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclude?: string[];
}

class LocationFilterDto {
  @ApiPropertyOptional({ type: [String], example: ['CZ'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cities?: string[];

  @ApiProperty({ description: 'Required if `remote` is false' })
  @IsBoolean()
  remote!: boolean;

  @ApiPropertyOptional({ description: 'Defaults to false when omitted' })
  @IsBoolean()
  @IsOptional()
  relocation?: boolean;
}

class SalaryExpectationDto {
  @ApiPropertyOptional({ minimum: 0, example: 3000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumSalary?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string;
}

class CompanyFilterDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  include?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclude?: string[];
}

export class SearchPreferencesDto {
  @ApiPropertyOptional({ type: KeywordFilterDto })
  @ValidateNested()
  @Type(() => KeywordFilterDto)
  @IsOptional()
  keywords?: KeywordFilterDto;

  @ApiProperty({ type: LocationFilterDto })
  @ValidateNested()
  @Type(() => LocationFilterDto)
  location!: LocationFilterDto;

  @ApiPropertyOptional({ type: SalaryExpectationDto })
  @ValidateNested()
  @Type(() => SalaryExpectationDto)
  @IsOptional()
  compensation?: SalaryExpectationDto;

  @ApiPropertyOptional({ enum: SENIORITY_LEVELS, isArray: true })
  @IsArray()
  @IsIn(SENIORITY_LEVELS, { each: true })
  @IsOptional()
  seniority?: Seniority[];

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES, isArray: true })
  @IsArray()
  @IsIn(EMPLOYMENT_TYPES, { each: true })
  @IsOptional()
  employmentTypes?: EmploymentType[];

  @ApiPropertyOptional({ type: CompanyFilterDto })
  @ValidateNested()
  @Type(() => CompanyFilterDto)
  @IsOptional()
  companies?: CompanyFilterDto;

  @ApiPropertyOptional({ type: [String], example: ['dou'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sources?: string[];
}
