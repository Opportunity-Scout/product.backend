import { Result } from '@app/common/kernel/Result';
import { DomainError } from '@app/common/kernel/DomainError';
import { LocationFilterProps } from './interfaces/LocationFilterProps';

export class LocationRequiresCountryError extends DomainError {
  constructor() {
    super('At least one country is required when remote is false');
  }
}

export class LocationFilter {
  private constructor(
    private readonly _countries: string[],
    private readonly _cities: string[],
    private readonly _remote: boolean,
    private readonly _relocation: boolean,
  ) {}

  static create(props: LocationFilterProps): Result<LocationFilter, LocationRequiresCountryError> {
    const countries = props.countries ?? [];

    if (!props.remote && countries.length === 0) {
      return Result.fail(new LocationRequiresCountryError());
    }

    return Result.ok(new LocationFilter(countries, props.cities ?? [], props.remote, props.relocation ?? false));
  }

  get countries(): string[] {
    return this._countries;
  }

  get cities(): string[] {
    return this._cities;
  }

  get remote(): boolean {
    return this._remote;
  }

  get relocation(): boolean {
    return this._relocation;
  }
}
