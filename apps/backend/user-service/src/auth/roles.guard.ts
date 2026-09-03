import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RequestUser } from './auth.decorators';
import { AppRole } from '../users/user-role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('errors.forbiddenNoUser');
    }

    const allowed = required.some((role) => user.roles.includes(role));
    if (!allowed) {
      throw new ForbiddenException('errors.forbiddenRole');
    }
    return true;
  }
}
