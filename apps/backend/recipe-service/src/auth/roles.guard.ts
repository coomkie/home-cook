import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type AppRole, type RequestUser } from './auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('errors.forbiddenNoUser');
    const ok = required.some((r) => user.roles.includes(r));
    if (!ok) throw new ForbiddenException('errors.forbiddenRole');
    return true;
  }
}
