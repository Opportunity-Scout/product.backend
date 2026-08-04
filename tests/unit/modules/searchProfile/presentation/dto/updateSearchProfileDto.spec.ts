import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSearchProfileDto } from '@app/modules/searchProfile/presentation/dto/UpdateSearchProfileDto';

describe('UpdateSearchProfileDto', () => {
  it('passes validation for an empty payload (every field omitted)', async () => {
    const dto = plainToInstance(UpdateSearchProfileDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation when name and preferences are provided', async () => {
    const dto = plainToInstance(UpdateSearchProfileDto, {
      name: 'Senior Backend Prague',
      preferences: { location: { remote: true } },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation when description is explicitly null', async () => {
    const dto = plainToInstance(UpdateSearchProfileDto, { description: null });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when name is explicitly null', async () => {
    const dto = plainToInstance(UpdateSearchProfileDto, { name: null });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });

  it('fails validation when preferences is explicitly null', async () => {
    const dto = plainToInstance(UpdateSearchProfileDto, { preferences: null });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'preferences')).toBe(true);
  });
});
