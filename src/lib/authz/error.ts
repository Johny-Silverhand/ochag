export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
