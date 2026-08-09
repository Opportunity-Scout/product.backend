export const DEFAULT_THROTTLE_TTL_MS = 60_000; // 1 minute window
export const DEFAULT_THROTTLE_LIMIT = 60; // requests per window, per IP

// Same window length as `default` today, but a separate constant on purpose —
// the two windows protect different things and are free to diverge later.
export const AUTH_LOGIN_THROTTLE_TTL_MS = 60_000;
export const AUTH_LOGIN_THROTTLE_LIMIT = 5; // requests per window, per targeted Telegram account — stricter than the default
