export const SearchProfileResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    userId: {
      type: 'string',
      format: 'uuid',
    },
    name: {
      type: 'string',
    },
    description: {
      type: ['string', 'null'],
    },
    status: {
      type: 'string',
      enum: ['active', 'paused', 'archived'],
    },
    preferences: {
      type: 'object',
      properties: {
        keywords: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'string' },
            },
            exclude: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['include', 'exclude'],
          additionalProperties: false,
        },
        location: {
          type: 'object',
          properties: {
            countries: {
              type: 'array',
              items: { type: 'string' },
            },
            cities: {
              type: 'array',
              items: { type: 'string' },
            },
            remote: { type: 'boolean' },
            relocation: { type: 'boolean' },
          },
          required: ['countries', 'cities', 'remote', 'relocation'],
          additionalProperties: false,
        },
        compensation: {
          type: 'object',
          properties: {
            minimumSalary: { type: ['number', 'null'] },
            currency: { type: ['string', 'null'] },
          },
          required: ['minimumSalary', 'currency'],
          additionalProperties: false,
        },
        seniority: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['intern', 'junior', 'middle', 'senior', 'lead'],
          },
        },
        employmentTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['full_time', 'part_time', 'contract', 'internship'],
          },
        },
        companies: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'string' },
            },
            exclude: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['include', 'exclude'],
          additionalProperties: false,
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['keywords', 'location', 'compensation', 'seniority', 'employmentTypes', 'companies', 'sources'],
      additionalProperties: false,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
    lastMatchedAt: {
      type: ['string', 'null'],
      format: 'date-time',
    },
  },
  required: ['id', 'userId', 'name', 'description', 'status', 'preferences', 'createdAt', 'updatedAt', 'lastMatchedAt'],
  additionalProperties: false,
} as const;
