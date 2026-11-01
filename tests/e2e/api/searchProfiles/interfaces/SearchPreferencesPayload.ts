import { KeywordFilterPayload } from './KeywordFilterPayload';
import { LocationFilterPayload } from './LocationFilterPayload';
import { SalaryExpectationPayload } from './SalaryExpectationPayload';
import { CompanyFilterPayload } from './CompanyFilterPayload';

export interface SearchPreferencesPayload {
  keywords?: KeywordFilterPayload;
  location: LocationFilterPayload;
  compensation?: SalaryExpectationPayload;
  seniority?: string[];
  employmentTypes?: string[];
  companies?: CompanyFilterPayload;
  sources?: string[];
}
