import axios from "axios";

export interface ApiErrorDetail { path: string; message: string }
export interface ApiErrorPayload {
  error?: { message?: string; details?: ApiErrorDetail[] };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload | undefined {
  return axios.isAxiosError<ApiErrorPayload>(error) ? error.response?.data : undefined;
}
