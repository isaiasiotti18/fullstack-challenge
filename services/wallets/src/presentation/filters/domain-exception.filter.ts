import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { DomainError } from "../../domain/errors";

const ERROR_STATUS_MAP: Record<string, HttpStatus> = {
  InsufficientBalanceError: HttpStatus.PAYMENT_REQUIRED,
  InvalidAmountError: HttpStatus.BAD_REQUEST,
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof DomainError) {
      const status = ERROR_STATUS_MAP[exception.name] ?? HttpStatus.BAD_REQUEST;

      response.status(status).json({
        statusCode: status,
        error: exception.name,
        message: exception.message,
      });
      return;
    }

    const message = exception instanceof Error ? exception.message : "Unknown error";
    this.logger.error(`Unhandled exception: ${message}`);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
}
