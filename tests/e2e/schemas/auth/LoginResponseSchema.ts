export const LoginResponseSchema = {
  type: 'object',
  required: ['token'],
  additionalProperties: false,
  properties: {
    token: {
      type: 'string',
      description: 'Bearer token to send as `Authorization: Bearer <token>` on subsequent requests',
    },
  },
} as const;
