import { KeywordFilterProps } from './interfaces/KeywordFilterProps';

export class KeywordFilter {
  private constructor(
    private readonly _include: string[],
    private readonly _exclude: string[],
  ) {}

  static create(props: KeywordFilterProps = {}): KeywordFilter {
    return new KeywordFilter(props.include ?? [], props.exclude ?? []);
  }

  get include(): string[] {
    return this._include;
  }

  get exclude(): string[] {
    return this._exclude;
  }
}
