import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateSearchProfileDto } from '@app/modules/searchProfile/presentation/dto/CreateSearchProfileDto';

function collectPropertyPaths(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [error.property, ...collectPropertyPaths(error.children ?? [])]);
}

describe('CreateSearchProfileDto', () => {
  it('passes validation for a minimal valid payload', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true } },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when name is missing', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      preferences: { location: { remote: true } },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('rejects unknown top-level properties when forbidNonWhitelisted is enabled', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true } },
      criteria: { location: { remote: true } },
    });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(errors.some((error) => error.property === 'criteria')).toBe(true);
  });

  it('passes validation for a full payload with every optional field set', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      name: 'Backend Prague',
      description: 'Remote-friendly backend roles',
      preferences: {
        keywords: { include: ['nestjs'], exclude: ['php'] },
        location: { countries: ['CZ'], cities: ['Prague'], remote: false, relocation: true },
        compensation: { minimumSalary: 3000, currency: 'EUR' },
        seniority: ['middle', 'senior'],
        employmentTypes: ['full_time'],
        companies: { include: ['Google'], exclude: ['Meta'] },
        sources: ['dou'],
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when minimumSalary is negative', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: { remote: true }, compensation: { minimumSalary: -1 } },
    });

    const errors = await validate(dto);

    expect(collectPropertyPaths(errors)).toContain('minimumSalary');
  });

  it('fails validation when location.remote is missing', async () => {
    const dto = plainToInstance(CreateSearchProfileDto, {
      userId: 'user-1',
      name: 'Backend Prague',
      preferences: { location: {} },
    });

    const errors = await validate(dto);

    expect(collectPropertyPaths(errors)).toContain('remote');
  });
});
