import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export type AppRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface RequestUser {
  userId: string;
  email: string;
  roles: AppRole[];
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
