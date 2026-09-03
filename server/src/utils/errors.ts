import axios from 'axios';

interface ProviderErrorBody {
  error?: { message?: string };
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ProviderErrorBody>(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export function getHttpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
