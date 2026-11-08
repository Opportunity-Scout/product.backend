import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { SearchProfileConcurrentModificationError } from '../application/errors/SearchProfileConcurrentModificationError';
import { SearchProfileNotFoundError } from '../application/errors/SearchProfileNotFoundError';

@Catch(SearchProfileConcurrentModificationError, SearchProfileNotFoundError)
export class SearchProfileUpdateExceptionFilter implements ExceptionFilter {
  catch(error: SearchProfileConcurrentModificationError | SearchProfileNotFoundError, host: ArgumentsHost): void {
    const httpException =
      error instanceof SearchProfileConcurrentModificationError
        ? new ConflictException(error.message)
        : new NotFoundException(error.message);

    host.switchToHttp().getResponse<Response>().status(httpException.getStatus()).json(httpException.getResponse());
  }
}
