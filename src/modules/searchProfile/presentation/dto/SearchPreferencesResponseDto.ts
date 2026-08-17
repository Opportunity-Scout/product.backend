import { ApiProperty } from '@nestjs/swagger';
import { EMPLOYMENT_TYPES, EmploymentType } from '../../domain/valueObjects/types/EmploymentType';
import { SENIORITY_LEVELS, Seniority } from '../../domain/valueObjects/types/Seniority';

class KeywordFilterResponseDto {
  @ApiProperty({ type: [String] })
  include!: string[];

  @ApiProperty({ type: [String] })
  exclude!: string[];
}

class LocationFilterResponseDto {
  @ApiProperty({ type: [String] })
  countries!: string[];

  @ApiProperty({ type: [String] })
  cities!: string[];

  @ApiProperty()
  remote!: boolean;

  @ApiProperty()
  relocation!: boolean;
}

class SalaryExpectationResponseDto {
  @ApiProperty({ nullable: true, type: Number })
  minimumSalary!: number | null;

  @ApiProperty({ nullable: true, type: String })
  currency!: string | null;
}

class CompanyFilterResponseDto {
  @ApiProperty({ type: [String] })
  include!: string[];

  @ApiProperty({ type: [String] })
  exclude!: string[];
}

export class SearchPreferencesResponseDto {
  @ApiProperty({ type: KeywordFilterResponseDto })
  keywords!: KeywordFilterResponseDto;

  @ApiProperty({ type: LocationFilterResponseDto })
  location!: LocationFilterResponseDto;

  @ApiProperty({ type: SalaryExpectationResponseDto })
  compensation!: SalaryExpectationResponseDto;

  @ApiProperty({ enum: SENIORITY_LEVELS, isArray: true })
  seniority!: Seniority[];

  @ApiProperty({ enum: EMPLOYMENT_TYPES, isArray: true })
  employmentTypes!: EmploymentType[];

  @ApiProperty({ type: CompanyFilterResponseDto })
  companies!: CompanyFilterResponseDto;

  @ApiProperty({ type: [String] })
  sources!: string[];
}
