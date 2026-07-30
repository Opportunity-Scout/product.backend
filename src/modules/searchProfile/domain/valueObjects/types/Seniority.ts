export const SENIORITY_LEVELS = ['intern', 'junior', 'middle', 'senior', 'lead'] as const;

export type Seniority = (typeof SENIORITY_LEVELS)[number];
