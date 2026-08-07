import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelegramLoginDto } from '@app/modules/auth/presentation/dto/TelegramLoginDto';

describe('TelegramLoginDto', () => {
  it('passes validation for a minimal valid payload', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      id: '12345',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'a-hash',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation for a full payload with every optional field set', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      id: '12345',
      first_name: 'Oleg',
      last_name: 'Teteriatnik',
      username: 'oleg',
      photo_url: 'https://t.me/i/userpic/oleg.jpg',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'a-hash',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when id is missing', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'a-hash',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'id')).toBe(true);
  });

  it('fails validation when auth_date is missing', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      id: '12345',
      hash: 'a-hash',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'auth_date')).toBe(true);
  });

  it('fails validation when hash is missing', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      id: '12345',
      auth_date: Math.floor(Date.now() / 1000),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'hash')).toBe(true);
  });

  it('rejects unknown top-level properties when forbidNonWhitelisted is enabled', async () => {
    const dto = plainToInstance(TelegramLoginDto, {
      id: '12345',
      auth_date: Math.floor(Date.now() / 1000),
      hash: 'a-hash',
      extra: 'not-allowed',
    });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(errors.some((error) => error.property === 'extra')).toBe(true);
  });
});
