import { KeywordFilter } from './KeywordFilter';
import { LocationFilter } from './LocationFilter';
import { SalaryExpectation } from './SalaryExpectation';
import { CompanyFilter } from './CompanyFilter';

export interface SearchPreferences {
  keywords: KeywordFilter;
  location: LocationFilter;
  compensation: SalaryExpectation;
  seniority: string[];
  employmentTypes: string[];
  companies: CompanyFilter;
  sources: string[];
}
