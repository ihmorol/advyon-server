/**
 * @fileoverview Common API contracts shared across all modules.
 * These interfaces define the standard shapes for API responses,
 * pagination, and error envelopes.
 */

/** Standard API success response envelope */
export interface IApiResponse<T = unknown> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

/** Standard paginated response meta */
export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** Paginated response wrapper */
export interface IPaginatedResponse<T> {
  meta: IPaginationMeta;
  data: T[];
}

/** Standard API error response */
export interface IApiError {
  statusCode: number;
  success: false;
  message: string;
  errorSources?: { path: string; message: string }[];
  stack?: string;
}

/** Query parameters for paginated list endpoints */
export interface IListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
