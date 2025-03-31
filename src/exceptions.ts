export class HTTPException extends Error {
  constructor(public statusCode: number, public options: { message: string }) {
    super(options.message);
  }
}

export class NotFoundException extends HTTPException {
  constructor(message: string = 'Not Found') {
    super(404, { message });
  }
}

export class BadRequestException extends HTTPException {
  constructor(message: string = 'Bad Request') {
    super(400, { message });
  }
}

export class UnauthorizedException extends HTTPException {
  constructor(message: string = 'Unauthorized') {
    super(401, { message });
  }
}

export class ForbiddenException extends HTTPException {
  constructor(message: string = 'Forbidden') {
    super(403, { message });
  }
}

export class InternalServerErrorException extends HTTPException {
  constructor(message: string = 'Internal Server Error') {
    super(500, { message });
  }
}



