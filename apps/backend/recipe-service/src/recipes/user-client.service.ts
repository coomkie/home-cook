import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserResponseDto } from '@app/shared';
import { AxiosError } from 'axios';

/**
 * Client gọi sang user-service qua HTTP.
 * Đây là phần "giao tiếp giữa services" mentor muốn bạn học.
 */
@Injectable()
export class UserClientService {
  private readonly baseUrl =
    process.env.USER_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async getUserById(userId: string): Promise<UserResponseDto> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<UserResponseDto>(`${this.baseUrl}/users/${userId}`),
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new NotFoundException(
          `Author ${userId} not found in user-service`,
        );
      }
      throw new BadGatewayException(
        `user-service unavailable: ${axiosError.message}`,
      );
    }
  }
}
