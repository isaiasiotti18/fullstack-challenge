import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { DomainError } from "../../domain/errors";

const STATUS_MAP: Record<string, HttpStatus> = {
  InvalidRoundStateError: HttpStatus.CONFLICT,
  DuplicateBetError: HttpStatus.CONFLICT,
  BetNotFoundError: HttpStatus.NOT_FOUND,
  InvalidBetAmountError: HttpStatus.BAD_REQUEST,
  InvalidCashOutMultiplierError: HttpStatus.BAD_REQUEST,
  InvalidBetStatusError: HttpStatus.CONFLICT,
  RoundNotFoundError: HttpStatus.NOT_FOUND,
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof DomainError) {
      const status = STATUS_MAP[exception.constructor.name] ?? HttpStatus.INTERNAL_SERVER_ERROR;

      this.logger.warn(`Domain error [${exception.constructor.name}]: ${exception.message}`);

      response.status(status).json({
        statusCode: status,
        error: exception.constructor.name,
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
