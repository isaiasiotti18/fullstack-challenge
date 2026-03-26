import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { DomainError } from "../../domain/errors";

const ERROR_STATUS_MAP: Record<string, HttpStatus> = {
  InsufficientBalanceError: HttpStatus.PAYMENT_REQUIRED,
  InvalidAmountError: HttpStatus.BAD_REQUEST,
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = ERROR_STATUS_MAP[exception.name] ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
