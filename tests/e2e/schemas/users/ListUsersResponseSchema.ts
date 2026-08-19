export const ListUsersResponseSchema = {
  type: 'object',
  required: ['users', 'total', 'limit', 'offset'],
  additionalProperties: false,
  properties: {
    users: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'telegramUserId', 'telegramUsername', 'role', 'searchProfileLimit', 'createdAt'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', format: 'uuid' },
          telegramUserId: { type: 'string' },
          telegramUsername: { type: ['string', 'null'] },
          role: { type: 'string', enum: ['user', 'admin'] },
          searchProfileLimit: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
  },
} as const;
