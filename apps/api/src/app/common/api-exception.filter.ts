import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    if (status >= 500) this.logger.error(JSON.stringify({ status, type: error instanceof Error ? error.name : 'UnknownError' }));
    const details = error instanceof HttpException ? error.getResponse() : 'Internal server error';
    response.status(status).json({ statusCode: status, error: HttpStatus[status] ?? 'Error', message: details });
  }
}
