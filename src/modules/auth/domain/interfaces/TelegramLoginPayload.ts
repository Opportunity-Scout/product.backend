// Field names mirror Telegram's own Login Widget wire format exactly
// (snake_case) — the HMAC signature is computed over these exact keys, so
// renaming them to our usual camelCase would break verification.
export interface TelegramLoginPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}
