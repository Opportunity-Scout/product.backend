export const SEARCH_PROFILE_STATUSES = ['active', 'paused', 'archived'] as const;

export type SearchProfileStatus = (typeof SEARCH_PROFILE_STATUSES)[number];
