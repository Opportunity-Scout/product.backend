import { CompanyFilterProps } from './interfaces/CompanyFilterProps';

export class CompanyFilter {
  private constructor(
    private readonly _include: string[],
    private readonly _exclude: string[],
  ) {}

  static create(props: CompanyFilterProps = {}): CompanyFilter {
    return new CompanyFilter(props.include ?? [], props.exclude ?? []);
  }

  get include(): string[] {
    return this._include;
  }

  get exclude(): string[] {
    return this._exclude;
  }
}
