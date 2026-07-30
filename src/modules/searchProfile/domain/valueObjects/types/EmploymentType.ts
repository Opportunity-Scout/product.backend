export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
