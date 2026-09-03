import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@app/shared';
import { appEnv } from '../app.env';
import type { AppRole, RequestUser } from './auth.decorators';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(appEnv.KEY) env: ConfigType<typeof appEnv>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtAccessSecret,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: (payload.roles ?? []) as AppRole[],
    };
  }
}
