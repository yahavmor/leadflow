export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what)
export const badRequest = (msg) => new HttpError(400, msg)
export const unauthorized = (msg = 'Please log in') => new HttpError(401, msg)
