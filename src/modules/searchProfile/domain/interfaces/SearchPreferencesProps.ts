import { KeywordFilterProps } from '../valueObjects/interfaces/KeywordFilterProps';
import { LocationFilterProps } from '../valueObjects/interfaces/LocationFilterProps';
import { SalaryExpectationProps } from '../valueObjects/interfaces/SalaryExpectationProps';
import { CompanyFilterProps } from '../valueObjects/interfaces/CompanyFilterProps';
import { Seniority } from '../valueObjects/types/Seniority';
import { EmploymentType } from '../valueObjects/types/EmploymentType';

export interface SearchPreferencesProps {
  keywords?: KeywordFilterProps;
  location: LocationFilterProps;
  compensation?: SalaryExpectationProps;
  seniority?: Seniority[];
  employmentTypes?: EmploymentType[];
  companies?: CompanyFilterProps;
  sources?: string[];
}
