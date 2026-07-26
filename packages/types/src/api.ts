export interface PaginationMeta {
  total?: number;
  limit?: number;
  page?: number;
  nextCursor?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
