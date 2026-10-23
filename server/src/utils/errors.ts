import { Response } from "express";

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  error: string;
  code: string;
  fieldErrors?: FieldError[];
  current?: any;
  blockers?: string[];
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  error: string,
  extras: Partial<ApiErrorPayload> = {}
) {
  const payload: ApiErrorPayload = {
    error,
    code,
    ...extras,
  };
  return res.status(statusCode).json(payload);
}

