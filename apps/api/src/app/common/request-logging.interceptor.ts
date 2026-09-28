import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; path: string }>();
    const start = Date.now();
    return next.handle().pipe(finalize(() => {
      this.logger.log(JSON.stringify({ method: req.method, path: req.path, durationMs: Date.now() - start }));
    }));
  }
}
