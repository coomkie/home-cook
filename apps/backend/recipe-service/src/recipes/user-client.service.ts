import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserResponseDto } from '@app/shared';
import { AxiosError } from 'axios';
import { appEnv } from '../app.env';

/**
 * Client gọi sang user-service qua HTTP.
 * Đây là phần "giao tiếp giữa services" mentor muốn bạn học.
 */
@Injectable()
export class UserClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    @Inject(appEnv.KEY) env: ConfigType<typeof appEnv>,
  ) {
    this.baseUrl = env.userServiceUrl;
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<UserResponseDto>(`${this.baseUrl}/users/${userId}`),
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new NotFoundException({
          message: 'errors.authorNotFound',
          args: { id: userId },
        });
      }
      throw new BadGatewayException({
        message: 'errors.userServiceUnavailable',
        args: { detail: axiosError.message },
      });
    }
  }
}
