import { ArgumentsHost } from '@nestjs/common';
import { SearchProfileConcurrentModificationError } from '@app/modules/searchProfile/application/errors/SearchProfileConcurrentModificationError';
import { SearchProfileNotFoundError } from '@app/modules/searchProfile/application/errors/SearchProfileNotFoundError';
import { SearchProfileUpdateExceptionFilter } from '@app/modules/searchProfile/presentation/SearchProfileUpdateExceptionFilter';

describe('SearchProfileUpdateExceptionFilter', () => {
  function buildHost() {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;

    return { response, host };
  }

  it('maps a version conflict to 409 Conflict in the standard Nest error body', () => {
    const { response, host } = buildHost();
    const error = new SearchProfileConcurrentModificationError('profile-1');

    new SearchProfileUpdateExceptionFilter().catch(error, host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 409, message: error.message, error: 'Conflict' });
  });

  it('maps a profile deleted mid-update to 404 Not Found in the standard Nest error body', () => {
    const { response, host } = buildHost();
    const error = new SearchProfileNotFoundError('profile-1');

    new SearchProfileUpdateExceptionFilter().catch(error, host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 404, message: error.message, error: 'Not Found' });
  });
});
