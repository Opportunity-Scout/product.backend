import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './interfaces/AuthenticatedRequest';

export const CurrentUser = createParamDecorator((data: keyof AuthenticatedRequest['user'], ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

  return request.user[data];
});
