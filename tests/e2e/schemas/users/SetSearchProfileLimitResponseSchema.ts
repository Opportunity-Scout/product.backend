export const SetSearchProfileLimitResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    searchProfileLimit: {
      type: 'number',
    },
  },
  required: ['id', 'searchProfileLimit'],
  additionalProperties: false,
} as const;
