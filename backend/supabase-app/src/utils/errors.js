export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const unauthorized = (message = "Please sign in") => new HttpError(401, "UNAUTHENTICATED", message);
export const forbidden = (code = "FORBIDDEN", message = "You do not have access to this resource") => new HttpError(403, code, message);
export const notFound = (message = "Not found") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (code, message, details) => new HttpError(409, code, message, details);
