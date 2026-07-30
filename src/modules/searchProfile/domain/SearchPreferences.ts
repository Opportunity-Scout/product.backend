import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { KeywordFilter } from './valueObjects/KeywordFilter';
import { LocationFilter } from './valueObjects/LocationFilter';
import { SalaryExpectation } from './valueObjects/SalaryExpectation';
import { CompanyFilter } from './valueObjects/CompanyFilter';
import { Seniority } from './valueObjects/types/Seniority';
import { EmploymentType } from './valueObjects/types/EmploymentType';
import { SearchPreferencesProps } from './interfaces/SearchPreferencesProps';

export class SearchPreferences {
  private constructor(
    private readonly _keywords: KeywordFilter,
    private readonly _location: LocationFilter,
    private readonly _compensation: SalaryExpectation,
    private readonly _seniority: Seniority[],
    private readonly _employmentTypes: EmploymentType[],
    private readonly _companies: CompanyFilter,
    private readonly _sources: string[],
  ) {}

  static create(props: SearchPreferencesProps): Result<SearchPreferences, DomainError> {
    const locationResult = LocationFilter.create(props.location);

    if (locationResult.isFailure) {
      return Result.fail(locationResult.error);
    }

    const compensationResult = SalaryExpectation.create(props.compensation);

    if (compensationResult.isFailure) {
      return Result.fail(compensationResult.error);
    }

    return Result.ok(
      new SearchPreferences(
        KeywordFilter.create(props.keywords),
        locationResult.value,
        compensationResult.value,
        props.seniority ?? [],
        props.employmentTypes ?? [],
        CompanyFilter.create(props.companies),
        props.sources ?? [],
      ),
    );
  }

  get keywords(): KeywordFilter {
    return this._keywords;
  }

  get location(): LocationFilter {
    return this._location;
  }

  get compensation(): SalaryExpectation {
    return this._compensation;
  }

  get seniority(): Seniority[] {
    return this._seniority;
  }

  get employmentTypes(): EmploymentType[] {
    return this._employmentTypes;
  }

  get companies(): CompanyFilter {
    return this._companies;
  }

  get sources(): string[] {
    return this._sources;
  }
}
