import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

// Erreurs du parseur de corps Express (http-errors) : elles portent un statut 4xx mais ne sont pas
// des HttpException Nest. Sans cela, un corps trop volumineux (413) ou un JSON invalide (400)
// seraient renvoyes en 500 "Erreur interne du serveur".
function describeException(exception: unknown): { status: number; message: string | object } {
  if (exception instanceof HttpException) {
    return { status: exception.getStatus(), message: exception.getResponse() };
  }

  const { status, statusCode } = (exception ?? {}) as { status?: unknown; statusCode?: unknown };
  const candidate = typeof status === 'number' ? status : statusCode;

  if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 400 && candidate < 500) {
    const message =
      candidate === HttpStatus.PAYLOAD_TOO_LARGE
        ? 'Requete trop volumineuse'
        : exception instanceof Error
          ? exception.message
          : 'Requete invalide';
    return { status: candidate, message };
  }

  return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erreur interne du serveur' };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = describeException(exception);

    this.logger.error(`${request.method} ${request.url} -> ${status}`, exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
