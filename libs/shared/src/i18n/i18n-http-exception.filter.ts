import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  parseAcceptLanguage,
  translateMaybeKey,
  type TranslateArgs,
} from './translate';

type ErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  args?: TranslateArgs;
};

/**
 * Dịch message/key trong HttpException theo Accept-Language.
 * Backend ném key (`errors.invalidCredentials`) → client nhận chuỗi đã map JSON.
 */
@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const locale = parseAcceptLanguage(req.headers['accept-language']);
    const status = exception.getStatus();
    const raw = exception.getResponse();

    let message: string | string[] = exception.message;
    let errorName = HttpStatus[status] ?? 'Error';
    let args: TranslateArgs | undefined;

    if (typeof raw === 'string') {
      message = translateMaybeKey(locale, raw);
    } else if (typeof raw === 'object' && raw !== null) {
      const body = raw as ErrorBody;
      args = body.args;
      errorName = body.error ?? errorName;
      if (Array.isArray(body.message)) {
        message = body.message.map((m) =>
          translateMaybeKey(locale, String(m), args),
        );
      } else if (typeof body.message === 'string') {
        message = translateMaybeKey(locale, body.message, args);
      }
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: errorName,
    });
  }
}
