import {
  BadGatewayException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';

/**
 * Gateway forward request sang các service nội bộ.
 * Client chỉ nói chuyện với port 3000 — không cần biết 3001/3002.
 */
@Injectable()
export class ProxyService {
  constructor(private readonly http: HttpService) {}

  async forward<T>(
    baseUrl: string,
    method: Method,
    path: string,
    body?: unknown,
    params?: Record<string, string | undefined>,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: `${baseUrl}${path}`,
      data: body,
      params,
    };

    try {
      const { data } = await firstValueFrom(this.http.request<T>(config));
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data as object | string,
          axiosError.response.status,
        );
      }
      throw new BadGatewayException(
        `Upstream ${baseUrl} unavailable: ${axiosError.message}`,
      );
    }
  }
}
