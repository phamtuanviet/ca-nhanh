// Gọi REST API /api/v1 từ Client Component (cookie phiên tự đi kèm)

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type Options = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** Trả `data` của phong bì { data }, hoặc ném ApiClientError với mã lỗi của 05 §9 */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Không kết nối được máy chủ, kiểm tra mạng và thử lại',
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'INTERNAL_ERROR',
      err?.message ?? 'Có lỗi xảy ra, vui lòng thử lại',
      err?.details ?? null,
    );
  }
  return body?.data as T;
}

/** Như api() nhưng trả cả meta (danh sách có phân trang) */
export async function apiList<T, M = { page: number; limit: number; total: number }>(
  path: string,
  signal?: AbortSignal,
): Promise<{ data: T[]; meta: M }> {
  const res = await fetch(`/api/v1${path}`, { cache: 'no-store', signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      body?.error?.code ?? 'INTERNAL_ERROR',
      body?.error?.message ?? 'Có lỗi xảy ra, vui lòng thử lại',
      body?.error?.details ?? null,
    );
  }
  return { data: body.data as T[], meta: body.meta as M };
}
