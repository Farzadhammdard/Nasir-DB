// Error taxonomy required by §34. Each error carries a stable i18n `code` for
// the user-facing message; the technical `message` is only ever written to the log.
export const ERROR_KIND = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  STORAGE: 'storage',
  PRINT: 'print',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
};

const STATUS_BY_KIND = {
  [ERROR_KIND.VALIDATION]: 422,
  [ERROR_KIND.AUTHENTICATION]: 401,
  [ERROR_KIND.AUTHORIZATION]: 403,
  [ERROR_KIND.DATABASE]: 500,
  [ERROR_KIND.STORAGE]: 500,
  [ERROR_KIND.PRINT]: 500,
  [ERROR_KIND.NETWORK]: 502,
  [ERROR_KIND.UNKNOWN]: 500,
};

const USER_SAFE_KINDS = new Set([ERROR_KIND.VALIDATION, ERROR_KIND.AUTHENTICATION, ERROR_KIND.AUTHORIZATION]);

export class AppError extends Error {
  constructor(kind, code, { message = '', status, field = '', details = null } = {}) {
    super(message || code);
    this.name = 'AppError';
    this.kind = kind;
    this.code = code;
    this.field = field;
    this.details = details;
    this.status = status || STATUS_BY_KIND[kind] || 500;
    this.exposeMessage = USER_SAFE_KINDS.has(kind);
  }

  toResponse() {
    return {
      error: {
        kind: this.kind,
        code: this.code,
        field: this.field || undefined,
        details: this.details || undefined,
        message: this.exposeMessage ? this.message : undefined,
      },
    };
  }
}

export const validationError = (code, field = '', details = null) =>
  new AppError(ERROR_KIND.VALIDATION, code, { field, details });

export const authenticationError = (code = 'errors.auth.invalid') =>
  new AppError(ERROR_KIND.AUTHENTICATION, code);

export const authorizationError = (code = 'errors.auth.forbidden') =>
  new AppError(ERROR_KIND.AUTHORIZATION, code);

export const storageError = (code, message) =>
  new AppError(ERROR_KIND.STORAGE, code, { message });

export const printError = (code, message) =>
  new AppError(ERROR_KIND.PRINT, code, { message });

export function classifyError(error) {
  if (error instanceof AppError) return error;

  const message = String(error?.message ?? error ?? '');
  if (/SQLITE_|database is locked|no such (table|column)|constraint failed/i.test(message)) {
    return new AppError(ERROR_KIND.DATABASE, 'errors.database.generic', { message });
  }
  if (/ENOENT|EACCES|EPERM|ENOSPC|EBUSY|EROFS/i.test(message)) {
    return new AppError(ERROR_KIND.STORAGE, 'errors.storage.generic', { message });
  }
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return new AppError(ERROR_KIND.NETWORK, 'errors.network.generic', { message });
  }
  return new AppError(ERROR_KIND.UNKNOWN, 'errors.unknown', { message });
}
