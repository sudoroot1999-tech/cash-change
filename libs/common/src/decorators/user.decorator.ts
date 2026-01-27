import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth.types';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {

    if (ctx.getType<string>() === 'graphql') {
      const context = GqlExecutionContext.create(ctx);
      return context.getContext().request?.user;
    }
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
