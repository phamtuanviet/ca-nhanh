import 'server-only';
import { ZodError } from 'zod';
import { ApiError, ERRORS, fromPostgrest } from '@/lib/errors';
import type { Role } from '@/lib/roles';
import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type ApiUser = {
  id: string;
  email: string | null;
  role: Role;
  status: 'active' | 'locked';
  onboarded: boolean;
};

type RequireUserOptions = {
  /** Vai trò được phép gọi; bỏ trống = mọi người đã đăng nhập */
  role?: Role | Role[];
  /** Cho phép tài khoản chưa onboarding (GET /me, POST /me/onboarding) */
  allowIncomplete?: boolean;
  /** Cho phép tài khoản bị khóa (GET /me để client hiển thị trạng thái) */
  allowLocked?: boolean;
};

function newRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return new ApiError(
      'VALIDATION_ERROR',
      error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }
  if (error instanceof SyntaxError) {
    return new ApiError('VALIDATION_ERROR', [
      { field: '', message: 'Body không phải JSON hợp lệ' },
    ]);
  }
  return new ApiError('INTERNAL_ERROR');
}

/**
 * Khung chung cho mọi Route Handler: gắn X-Request-Id, bắt lỗi và trả phong bì lỗi chuẩn (05 §2.1).
 * Đọc header của request nên route luôn chạy lúc request (không bị prerender khi build).
 */
export async function handle(req: Request, fn: () => Promise<Response>): Promise<Response> {
  const requestId = req.headers.get('x-request-id')?.slice(0, 64) || newRequestId();
  let response: Response;
  try {
    response = await fn();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status >= 500) {
      console.error(`[${requestId}] ${req.method} ${new URL(req.url).pathname}`, error);
    }
    response = Response.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details ?? null,
          request_id: requestId,
        },
      },
      { status: apiError.status },
    );
  }
  response.headers.set('X-Request-Id', requestId);
  return response;
}

type PostgrestResult<T> = {
  data: T;
  error: { code?: string | null; message: string; details?: string | null } | null;
};

/** Ném ApiError nếu PostgREST trả lỗi; không có dữ liệu thì 404 */
export function unwrap<T>(result: PostgrestResult<T>): NonNullable<T> {
  if (result.error) throw fromPostgrest(result.error);
  if (result.data === null || result.data === undefined) throw new ApiError('NOT_FOUND');
  return result.data as NonNullable<T>;
}

/** Như unwrap nhưng cho phép null (dùng với maybeSingle) */
export function unwrapMaybe<T>(result: PostgrestResult<T>): T {
  if (result.error) throw fromPostgrest(result.error);
  return result.data;
}

async function userIdFromRequest(
  req: Request,
): Promise<{ id: string; email: string | null } | null> {
  const authorization = req.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    // Postman, script: access token lấy từ Supabase Auth
    const token = authorization.slice(7).trim();
    const { data, error } = await adminClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === 'string' ? data.claims.email : null;
  return { id: data.claims.sub, email };
}

/** Xác thực bằng cookie phiên hoặc `Authorization: Bearer`, rồi kiểm tra vai trò (03 §7.1) */
export async function requireUser(
  req: Request,
  options: RequireUserOptions = {},
): Promise<ApiUser> {
  const identity = await userIdFromRequest(req);
  if (!identity) throw new ApiError('UNAUTHENTICATED');

  const { data: profile, error } = await adminClient()
    .from('profiles')
    .select('role, status, onboarded_at')
    .eq('id', identity.id)
    .maybeSingle();
  if (error) throw fromPostgrest(error);
  if (!profile) throw new ApiError('UNAUTHENTICATED');

  const user: ApiUser = {
    id: identity.id,
    email: identity.email,
    role: profile.role,
    status: profile.status,
    onboarded: profile.onboarded_at !== null,
  };
  if (user.status === 'locked' && !options.allowLocked) throw new ApiError('ACCOUNT_LOCKED');
  if (!user.onboarded && !options.allowIncomplete) throw new ApiError('PROFILE_INCOMPLETE');
  if (options.role) {
    const allowed = Array.isArray(options.role) ? options.role : [options.role];
    if (!allowed.includes(user.role)) throw new ApiError('FORBIDDEN');
  }
  return user;
}

/** Phản hồi thành công theo phong bì `{ data }` */
export function ok(data: unknown, init?: ResponseInit & { meta?: Record<string, unknown> }) {
  const { meta, ...rest } = init ?? {};
  return Response.json(meta ? { data, meta } : { data }, rest);
}

export { ApiError, ERRORS };
